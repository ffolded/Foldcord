/*
 * Foldcord Installer
 * Copyright (c) 2026 xohus and CloudCord
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Code-only WPF (no XAML) so it builds with the C# compiler that ships with
 * Windows (.NET Framework 4.8, C# 5). See build.sh.
 */

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using IOPath = System.IO.Path;

namespace Foldcord.Installer
{
    public class DiscordBuild
    {
        public string Name;
        public string Folder;   // %LOCALAPPDATA%\Discord etc.
        public string Exe;      // Discord.exe etc.

        public string LatestAppDir()
        {
            if (!Directory.Exists(Folder)) return null;
            return Directory.GetDirectories(Folder, "app-*")
                .OrderByDescending(d => ParseVersion(IOPath.GetFileName(d).Substring(4)))
                .FirstOrDefault();
        }

        static Version ParseVersion(string s)
        {
            Version v;
            return Version.TryParse(s, out v) ? v : new Version(0, 0);
        }

        public string Resources
        {
            get { var app = LatestAppDir(); return app == null ? null : IOPath.Combine(app, "resources"); }
        }

        public bool Exists { get { return Resources != null && Directory.Exists(Resources); } }

        public bool IsInstalled
        {
            get
            {
                if (!Exists) return false;
                var index = IOPath.Combine(Resources, "app", "index.js");
                return File.Exists(index) && File.ReadAllText(index).Contains("Foldcord");
            }
        }
    }

    public static class Core
    {
        public static readonly string DistDir = IOPath.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Foldcord", "dist");

        static readonly string[] DistFiles = { "patcher.js", "preload.js", "renderer.js", "renderer.css", "package.json" };

        public static List<DiscordBuild> FindBuilds()
        {
            var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            return new List<DiscordBuild> {
                new DiscordBuild { Name = "Discord", Folder = IOPath.Combine(local, "Discord"), Exe = "Discord.exe" },
                new DiscordBuild { Name = "Discord PTB", Folder = IOPath.Combine(local, "DiscordPTB"), Exe = "DiscordPTB.exe" },
                new DiscordBuild { Name = "Discord Canary", Folder = IOPath.Combine(local, "DiscordCanary"), Exe = "DiscordCanary.exe" },
            };
        }

        public static void WriteDist()
        {
            Directory.CreateDirectory(DistDir);
            var asm = Assembly.GetExecutingAssembly();
            foreach (var name in DistFiles)
            {
                using (var src = asm.GetManifestResourceStream("dist." + name))
                {
                    if (src == null) throw new Exception("Installer is missing " + name);
                    using (var dst = File.Create(IOPath.Combine(DistDir, name))) src.CopyTo(dst);
                }
            }
        }

        public static void KillDiscord(DiscordBuild b)
        {
            foreach (var p in Process.GetProcessesByName(IOPath.GetFileNameWithoutExtension(b.Exe)))
            {
                try { p.Kill(); p.WaitForExit(5000); } catch { }
            }
        }

        public static void Inject(DiscordBuild b)
        {
            var res = b.Resources;
            var asar = IOPath.Combine(res, "app.asar");
            var backup = IOPath.Combine(res, "_app.asar");
            var app = IOPath.Combine(res, "app");

            if (File.Exists(asar) && !File.Exists(backup)) File.Move(asar, backup);
            if (!File.Exists(backup)) throw new Exception(b.Name + " looks damaged: app.asar is missing. Reinstall Discord and try again.");

            Directory.CreateDirectory(app);
            var patcher = IOPath.Combine(DistDir, "patcher.js").Replace('\\', '/');
            File.WriteAllText(IOPath.Combine(app, "index.js"), "// Foldcord\nrequire(\"" + patcher + "\");\n");
            File.WriteAllText(IOPath.Combine(app, "package.json"), "{\"name\":\"discord\",\"main\":\"index.js\"}\n");
        }

        public static void Remove(DiscordBuild b)
        {
            var res = b.Resources;
            var asar = IOPath.Combine(res, "app.asar");
            var backup = IOPath.Combine(res, "_app.asar");
            var app = IOPath.Combine(res, "app");
            if (Directory.Exists(app)) Directory.Delete(app, true);
            if (File.Exists(backup) && !File.Exists(asar)) File.Move(backup, asar);
        }

        public static void Launch(DiscordBuild b)
        {
            var update = IOPath.Combine(b.Folder, "Update.exe");
            if (File.Exists(update))
                Process.Start(new ProcessStartInfo(update, "--processStart " + b.Exe) { UseShellExecute = false });
        }
    }

    public class App : Application
    {
        [STAThread]
        public static void Main()
        {
            var app = new App();
            app.Run(new MainWindow());
        }
    }

    public class MainWindow : Window
    {
        static readonly Color Accent = Color.FromRgb(124, 92, 255);
        static readonly Color Accent2 = Color.FromRgb(91, 60, 230);
        static readonly Brush TextBrush = new SolidColorBrush(Color.FromRgb(242, 243, 245));
        static readonly Brush MutedBrush = new SolidColorBrush(Color.FromRgb(160, 160, 180));
        static readonly FontFamily Font = new FontFamily("Segoe UI Variable Display, Segoe UI");

        readonly Grid root = new Grid();
        readonly Grid content = new Grid();
        readonly List<DiscordBuild> builds = Core.FindBuilds();
        readonly Dictionary<DiscordBuild, CheckBox> picks = new Dictionary<DiscordBuild, CheckBox>();
        Image logo;
        StackPanel brand;

        public MainWindow()
        {
            Title = "Foldcord Installer";
            Width = 860; Height = 540;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            ResizeMode = ResizeMode.NoResize;
            Background = Brushes.Transparent;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            FontFamily = Font;
            Icon = LoadImage("logo.png");

            var frame = new Border
            {
                Margin = new Thickness(20),
                CornerRadius = new CornerRadius(22),
                ClipToBounds = true,
                Background = new LinearGradientBrush(Color.FromRgb(26, 16, 54), Color.FromRgb(10, 8, 20), 65),
                Effect = new DropShadowEffect { BlurRadius = 40, ShadowDepth = 0, Opacity = 0.6, Color = Colors.Black },
                Child = root,
                Opacity = 0,
            };
            frame.MouseLeftButtonDown += (s, e) => { if (e.ButtonState == MouseButtonState.Pressed) DragMove(); };
            Content = frame;

            BuildBackground();
            BuildChrome();
            root.Children.Add(content);

            Loaded += (s, e) => Opening(frame);
            SetupSnapshots(frame);
        }

        // Test hook: FOLDCORD_SNAPSHOT=<dir> renders the window to PNGs while it runs.
        void SetupSnapshots(Border frame)
        {
            var dir = Environment.GetEnvironmentVariable("FOLDCORD_SNAPSHOT");
            if (string.IsNullOrEmpty(dir)) return;
            var times = new[] { 700, 1300, 3600 };
            for (var i = 0; i < times.Length; i++)
            {
                var n = i + 1;
                var t = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(times[i]) };
                t.Tick += (s, e) => { t.Stop(); Snapshot(frame, IOPath.Combine(dir, "snap-" + n + ".png")); };
                t.Start();
            }
        }

        int panelShots;
        void SnapshotPanel()
        {
            var dir = Environment.GetEnvironmentVariable("FOLDCORD_SNAPSHOT");
            if (string.IsNullOrEmpty(dir)) return;
            var n = ++panelShots;
            var frame = (Border)Content;
            var t = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(900) };
            t.Tick += (s, e) => { t.Stop(); Snapshot(frame, IOPath.Combine(dir, "panel-" + n + ".png")); };
            t.Start();
        }

        public static void Snapshot(FrameworkElement el, string file)
        {
            var bmp = new RenderTargetBitmap((int)(el.ActualWidth + 40), (int)(el.ActualHeight + 40), 96, 96, PixelFormats.Pbgra32);
            bmp.Render(el);
            var enc = new PngBitmapEncoder();
            enc.Frames.Add(BitmapFrame.Create(bmp));
            using (var f = File.Create(file)) enc.Save(f);
        }

        // ---------- visuals ----------

        void BuildBackground()
        {
            var canvas = new Canvas { IsHitTestVisible = false };
            root.Children.Add(canvas);
            AddOrb(canvas, 420, Accent, -120, -160, 60, 40, 9);
            AddOrb(canvas, 360, Color.FromRgb(196, 77, 255), 520, 260, -70, -50, 11);
            AddOrb(canvas, 260, Color.FromRgb(70, 120, 255), 600, -120, -40, 70, 13);
        }

        void AddOrb(Canvas c, double size, Color color, double x, double y, double dx, double dy, double seconds)
        {
            var orb = new Ellipse
            {
                Width = size, Height = size, Opacity = 0.35,
                Fill = new RadialGradientBrush(color, Color.FromArgb(0, color.R, color.G, color.B)),
                Effect = new BlurEffect { Radius = 60 },
            };
            Canvas.SetLeft(orb, x); Canvas.SetTop(orb, y);
            c.Children.Add(orb);
            var t = new TranslateTransform();
            orb.RenderTransform = t;
            var ease = new SineEase { EasingMode = EasingMode.EaseInOut };
            t.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(0, dx, TimeSpan.FromSeconds(seconds)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = ease });
            t.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(0, dy, TimeSpan.FromSeconds(seconds * 0.8)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = ease });
        }

        void BuildChrome()
        {
            var bar = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(0, 12, 14, 0) };
            bar.Children.Add(ChromeButton("", () => WindowState = WindowState.Minimized));
            bar.Children.Add(ChromeButton("", Close));
            Panel.SetZIndex(bar, 10);
            root.Children.Add(bar);
        }

        Button ChromeButton(string glyph, Action click)
        {
            var b = new Button
            {
                Content = new TextBlock { Text = glyph, FontFamily = new FontFamily("Segoe MDL2 Assets, Segoe Fluent Icons"), FontSize = 11, Foreground = MutedBrush },
                Width = 34, Height = 30, Margin = new Thickness(2, 0, 0, 0), Cursor = Cursors.Hand,
                Template = FlatTemplate(8, Color.FromArgb(40, 255, 255, 255)),
                Background = Brushes.Transparent,
            };
            b.Click += (s, e) => click();
            return b;
        }

        static ControlTemplate FlatTemplate(double radius, Color hover)
        {
            var t = new ControlTemplate(typeof(Button));
            var border = new FrameworkElementFactory(typeof(Border), "bd");
            border.SetBinding(Border.BackgroundProperty, new System.Windows.Data.Binding("Background") { RelativeSource = System.Windows.Data.RelativeSource.TemplatedParent });
            border.SetValue(Border.CornerRadiusProperty, new CornerRadius(radius));
            var cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            border.AppendChild(cp);
            t.VisualTree = border;
            var trig = new Trigger { Property = UIElement.IsMouseOverProperty, Value = true };
            trig.Setters.Add(new Setter(UIElement.OpacityProperty, 0.88));
            t.Triggers.Add(trig);
            var press = new Trigger { Property = System.Windows.Controls.Primitives.ButtonBase.IsPressedProperty, Value = true };
            press.Setters.Add(new Setter(UIElement.RenderTransformProperty, new ScaleTransform(0.97, 0.97)));
            press.Setters.Add(new Setter(UIElement.RenderTransformOriginProperty, new Point(0.5, 0.5)));
            t.Triggers.Add(press);
            return t;
        }

        static BitmapImage LoadImage(string name)
        {
            var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
            if (s == null) return null;
            var img = new BitmapImage();
            img.BeginInit(); img.StreamSource = s; img.CacheOption = BitmapCacheOption.OnLoad; img.EndInit();
            return img;
        }

        Button PrimaryButton(string text, Action click)
        {
            var b = new Button
            {
                Content = new TextBlock { Text = text, FontSize = 15, FontWeight = FontWeights.SemiBold, Foreground = Brushes.White },
                Height = 46, MinWidth = 160, Padding = new Thickness(26, 0, 26, 0), Cursor = Cursors.Hand,
                Background = new LinearGradientBrush(Color.FromRgb(146, 118, 255), Accent2, 30),
                Template = FlatTemplate(12, Accent),
                Effect = new DropShadowEffect { BlurRadius = 24, ShadowDepth = 0, Opacity = 0.55, Color = Accent },
            };
            b.Click += (s, e) => click();
            return b;
        }

        Button GhostButton(string text, Action click)
        {
            var b = new Button
            {
                Content = new TextBlock { Text = text, FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = TextBrush },
                Height = 46, MinWidth = 120, Padding = new Thickness(20, 0, 20, 0), Cursor = Cursors.Hand,
                Background = new SolidColorBrush(Color.FromArgb(28, 255, 255, 255)),
                Template = FlatTemplate(12, Color.FromArgb(50, 255, 255, 255)),
            };
            b.Click += (s, e) => click();
            return b;
        }

        static void FadeIn(UIElement el, double delayMs, double fromY = 18, double ms = 520)
        {
            el.Opacity = 0;
            var t = new TranslateTransform(0, fromY);
            el.RenderTransform = t;
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
            var begin = TimeSpan.FromMilliseconds(delayMs);
            el.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(ms)) { BeginTime = begin, EasingFunction = ease });
            t.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(fromY, 0, TimeSpan.FromMilliseconds(ms)) { BeginTime = begin, EasingFunction = ease });
        }

        // ---------- screens ----------

        void Opening(Border frame)
        {
            frame.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(350)));

            logo = new Image { Source = LoadImage("logo.png"), Width = 120, Height = 120, RenderTransformOrigin = new Point(0.5, 0.5) };
            logo.Effect = new DropShadowEffect { BlurRadius = 50, ShadowDepth = 0, Color = Accent, Opacity = 0.9 };
            var title = new TextBlock { Text = "Foldcord", FontSize = 46, FontWeight = FontWeights.Bold, Foreground = TextBrush, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 18, 0, 0) };
            var sub = new TextBlock { Text = "Light, fast, and yours.", FontSize = 16, Foreground = MutedBrush, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 6, 0, 0) };
            brand = new StackPanel { VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Center };
            brand.Children.Add(logo); brand.Children.Add(title); brand.Children.Add(sub);
            content.Children.Add(brand);

            var group = new TransformGroup();
            var scale = new ScaleTransform(0.3, 0.3);
            var rot = new RotateTransform(-25);
            group.Children.Add(scale); group.Children.Add(rot);
            logo.RenderTransform = group;
            logo.Opacity = 0;
            var back = new BackEase { EasingMode = EasingMode.EaseOut, Amplitude = 0.5 };
            var dur = TimeSpan.FromMilliseconds(900);
            var start = TimeSpan.FromMilliseconds(250);
            logo.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(500)) { BeginTime = start });
            scale.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(0.3, 1, dur) { BeginTime = start, EasingFunction = back });
            scale.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(0.3, 1, dur) { BeginTime = start, EasingFunction = back });
            rot.BeginAnimation(RotateTransform.AngleProperty, new DoubleAnimation(-25, 0, dur) { BeginTime = start, EasingFunction = back });
            ((DropShadowEffect)logo.Effect).BeginAnimation(DropShadowEffect.BlurRadiusProperty,
                new DoubleAnimation(20, 60, TimeSpan.FromSeconds(1.6)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, BeginTime = TimeSpan.FromMilliseconds(900) });

            FadeIn(title, 750);
            FadeIn(sub, 950);

            var timer = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(2100) };
            timer.Tick += (s, e) => { timer.Stop(); ShowChooser(); };
            timer.Start();
        }

        void MoveBrandToHeader()
        {
            var ease = new CubicEase { EasingMode = EasingMode.EaseInOut };
            var t = new TranslateTransform();
            var sc = new ScaleTransform(1, 1);
            var g = new TransformGroup(); g.Children.Add(sc); g.Children.Add(t);
            brand.RenderTransformOrigin = new Point(0.5, 0);
            brand.RenderTransform = g;
            brand.VerticalAlignment = VerticalAlignment.Top;
            brand.Margin = new Thickness(0, 90, 0, 0);
            t.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(0, -66, TimeSpan.FromMilliseconds(600)) { EasingFunction = ease });
            sc.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(1, 0.62, TimeSpan.FromMilliseconds(600)) { EasingFunction = ease });
            sc.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(1, 0.62, TimeSpan.FromMilliseconds(600)) { EasingFunction = ease });
        }

        UIElement panel;

        void SetPanel(UIElement el)
        {
            if (panel != null)
            {
                var old = panel;
                var a = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(200));
                a.Completed += (s, e) => content.Children.Remove(old);
                old.BeginAnimation(UIElement.OpacityProperty, a);
            }
            panel = el;
            content.Children.Add(el);
            FadeIn(el, 120, 26, 480);
            SnapshotPanel();
        }

        void ShowChooser()
        {
            if (brand.Margin.Top == 0) MoveBrandToHeader();

            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Bottom, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 38), Width = 560 };
            stack.Children.Add(new TextBlock { Text = "Choose where to install", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = MutedBrush, Margin = new Thickness(4, 0, 0, 10) });

            var found = builds.Where(b => b.Exists).ToList();
            if (found.Count == 0)
            {
                stack.Children.Add(Card(new TextBlock { Text = "Discord isn't installed yet. Install Discord first, then run this again.", Foreground = TextBrush, FontSize = 14, TextWrapping = TextWrapping.Wrap }));
            }
            var i = 0;
            foreach (var b in found)
            {
                var row = new DockPanel();
                var box = new CheckBox { IsChecked = i == 0, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 14, 0), Cursor = Cursors.Hand, Template = CheckTemplate() };
                picks[b] = box;
                DockPanel.SetDock(box, Dock.Left);
                row.Children.Add(box);
                var status = new TextBlock
                {
                    Text = b.IsInstalled ? "● Foldcord installed" : "Not installed",
                    Foreground = b.IsInstalled ? new SolidColorBrush(Color.FromRgb(87, 242, 135)) : MutedBrush,
                    FontSize = 13, VerticalAlignment = VerticalAlignment.Center
                };
                DockPanel.SetDock(status, Dock.Right);
                row.Children.Add(status);
                row.Children.Add(new TextBlock { Text = b.Name, FontSize = 16, FontWeight = FontWeights.SemiBold, Foreground = TextBrush, VerticalAlignment = VerticalAlignment.Center });
                var card = Card(row);
                card.Cursor = Cursors.Hand;
                card.MouseLeftButtonUp += (s, e) => { box.IsChecked = !(box.IsChecked ?? false); };
                card.Margin = new Thickness(0, 0, 0, 8);
                stack.Children.Add(card);
                FadeIn(card, 200 + i * 90);
                i++;
            }

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 14, 0, 0) };
            var uninstall = GhostButton("Uninstall", () => Run(false));
            uninstall.Margin = new Thickness(0, 0, 10, 0);
            buttons.Children.Add(uninstall);
            buttons.Children.Add(PrimaryButton(found.Any(b => b.IsInstalled) ? "Repair / Update" : "Install Foldcord", () => Run(true)));
            if (found.Count > 0) stack.Children.Add(buttons);

            SetPanel(stack);
        }

        // Rounded check box: outlined when off, purple with a white tick when on.
        static ControlTemplate CheckTemplate()
        {
            var t = new ControlTemplate(typeof(CheckBox));
            var box = new FrameworkElementFactory(typeof(Border), "box");
            box.SetValue(FrameworkElement.WidthProperty, 22.0);
            box.SetValue(FrameworkElement.HeightProperty, 22.0);
            box.SetValue(Border.CornerRadiusProperty, new CornerRadius(7));
            box.SetValue(Border.BorderThicknessProperty, new Thickness(2));
            box.SetValue(Border.BorderBrushProperty, new SolidColorBrush(Color.FromArgb(110, 255, 255, 255)));
            box.SetValue(Border.BackgroundProperty, Brushes.Transparent);
            var tick = new FrameworkElementFactory(typeof(System.Windows.Shapes.Path), "tick");
            tick.SetValue(System.Windows.Shapes.Path.DataProperty, Geometry.Parse("M 4,10 L 8,14 L 15,6"));
            tick.SetValue(Shape.StrokeProperty, Brushes.White);
            tick.SetValue(Shape.StrokeThicknessProperty, 2.6);
            tick.SetValue(Shape.StrokeStartLineCapProperty, PenLineCap.Round);
            tick.SetValue(Shape.StrokeEndLineCapProperty, PenLineCap.Round);
            tick.SetValue(Shape.StrokeLineJoinProperty, PenLineJoin.Round);
            tick.SetValue(UIElement.VisibilityProperty, Visibility.Collapsed);
            box.AppendChild(tick);
            t.VisualTree = box;
            var on = new Trigger { Property = System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty, Value = true };
            on.Setters.Add(new Setter(Border.BackgroundProperty, new SolidColorBrush(Accent), "box"));
            on.Setters.Add(new Setter(Border.BorderBrushProperty, new SolidColorBrush(Accent), "box"));
            on.Setters.Add(new Setter(UIElement.VisibilityProperty, Visibility.Visible, "tick"));
            t.Triggers.Add(on);
            return t;
        }

        Border Card(UIElement child)
        {
            return new Border
            {
                Child = child, Padding = new Thickness(18, 14, 18, 14), CornerRadius = new CornerRadius(14),
                Background = new SolidColorBrush(Color.FromArgb(22, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)), BorderThickness = new Thickness(1),
            };
        }

        void Run(bool install)
        {
            var targets = picks.Where(p => p.Value.IsChecked == true).Select(p => p.Key).ToList();
            if (targets.Count == 0) return;

            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Bottom, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 70), Width = 520 };
            var label = new TextBlock { Text = install ? "Getting things ready…" : "Removing Foldcord…", FontSize = 16, FontWeight = FontWeights.SemiBold, Foreground = TextBrush, Margin = new Thickness(0, 0, 0, 14) };
            stack.Children.Add(label);
            var track = new Border { Height = 10, CornerRadius = new CornerRadius(5), Background = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)), ClipToBounds = true };
            var fill = new Border { Height = 10, CornerRadius = new CornerRadius(5), HorizontalAlignment = HorizontalAlignment.Left, Width = 0, Background = new LinearGradientBrush(Color.FromRgb(160, 130, 255), Accent2, 0) };
            var shimmer = new Border { Width = 120, Background = new LinearGradientBrush(Color.FromArgb(0, 255, 255, 255), Color.FromArgb(90, 255, 255, 255), 0), HorizontalAlignment = HorizontalAlignment.Left };
            var st = new TranslateTransform(-120, 0);
            shimmer.RenderTransform = st;
            st.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(-120, 540, TimeSpan.FromSeconds(1.2)) { RepeatBehavior = RepeatBehavior.Forever });
            var g = new Grid(); g.Children.Add(fill); g.Children.Add(shimmer);
            track.Child = g;
            stack.Children.Add(track);
            SetPanel(stack);

            Action<double, string> step = (frac, text) => Dispatcher.Invoke(() =>
            {
                label.Text = text;
                fill.BeginAnimation(WidthProperty, new DoubleAnimation(520 * frac, TimeSpan.FromMilliseconds(450)) { EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut } });
            });

            Task.Run(() =>
            {
                try
                {
                    System.Threading.Thread.Sleep(350);
                    if (install) { step(0.2, "Unpacking Foldcord…"); Core.WriteDist(); System.Threading.Thread.Sleep(300); }
                    var n = 0;
                    foreach (var b in targets)
                    {
                        step(0.35 + 0.5 * n / targets.Count, "Closing " + b.Name + "…");
                        Core.KillDiscord(b);
                        System.Threading.Thread.Sleep(600);
                        step(0.45 + 0.5 * n / targets.Count, (install ? "Installing into " : "Removing from ") + b.Name + "…");
                        if (install) Core.Inject(b); else Core.Remove(b);
                        n++;
                        System.Threading.Thread.Sleep(300);
                    }
                    step(1, "Done");
                    System.Threading.Thread.Sleep(450);
                    Dispatcher.Invoke(() => ShowDone(install, targets));
                }
                catch (Exception ex)
                {
                    Dispatcher.Invoke(() => ShowError(ex.Message));
                }
            });
        }

        void ShowDone(bool installed, List<DiscordBuild> targets)
        {
            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Bottom, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 40) };

            var check = new Grid { Width = 74, Height = 74, HorizontalAlignment = HorizontalAlignment.Center };
            var circle = new Ellipse { Fill = new LinearGradientBrush(Color.FromRgb(146, 118, 255), Accent2, 45), Effect = new DropShadowEffect { BlurRadius = 30, ShadowDepth = 0, Color = Accent, Opacity = 0.8 } };
            var tick = new System.Windows.Shapes.Path
            {
                Data = Geometry.Parse("M 22,38 L 33,49 L 53,27"), Stroke = Brushes.White, StrokeThickness = 6,
                StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, StrokeLineJoin = PenLineJoin.Round,
                StrokeDashArray = new DoubleCollection { 10, 10 }, StrokeDashOffset = 10,
            };
            check.Children.Add(circle); check.Children.Add(tick);
            var pop = new ScaleTransform(0, 0);
            check.RenderTransformOrigin = new Point(0.5, 0.5);
            check.RenderTransform = pop;
            var back = new BackEase { EasingMode = EasingMode.EaseOut, Amplitude = 0.6 };
            pop.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(600)) { EasingFunction = back });
            pop.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(600)) { EasingFunction = back });
            tick.BeginAnimation(Shape.StrokeDashOffsetProperty, new DoubleAnimation(10, 0, TimeSpan.FromMilliseconds(500)) { BeginTime = TimeSpan.FromMilliseconds(350) });
            stack.Children.Add(check);

            stack.Children.Add(new TextBlock
            {
                Text = installed ? "Foldcord is installed" : "Foldcord was removed",
                FontSize = 24, FontWeight = FontWeights.Bold, Foreground = TextBrush, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 18, 0, 4)
            });
            stack.Children.Add(new TextBlock
            {
                Text = installed ? "Open Discord and a quick tour will show you around." : "Discord is back to normal.",
                FontSize = 14, Foreground = MutedBrush, HorizontalAlignment = HorizontalAlignment.Center
            });

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 22, 0, 0) };
            var close = GhostButton("Close", Close);
            close.Margin = new Thickness(0, 0, 10, 0);
            buttons.Children.Add(close);
            buttons.Children.Add(PrimaryButton("Open Discord", () => { foreach (var b in targets) Core.Launch(b); Close(); }));
            stack.Children.Add(buttons);

            SetPanel(stack);
        }

        void ShowError(string message)
        {
            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Bottom, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 0, 0, 48), Width = 520 };
            stack.Children.Add(new TextBlock { Text = "Something went wrong", FontSize = 22, FontWeight = FontWeights.Bold, Foreground = new SolidColorBrush(Color.FromRgb(242, 63, 67)), HorizontalAlignment = HorizontalAlignment.Center });
            stack.Children.Add(new TextBlock { Text = message, FontSize = 14, Foreground = TextBrush, TextWrapping = TextWrapping.Wrap, TextAlignment = TextAlignment.Center, Margin = new Thickness(0, 10, 0, 18) });
            var again = PrimaryButton("Try again", ShowChooser);
            again.HorizontalAlignment = HorizontalAlignment.Center;
            stack.Children.Add(again);
            SetPanel(stack);
        }
    }
}
