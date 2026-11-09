# Foldcord badges

`badges.json` maps a Discord user ID to the badges they show on their profile. Foldcord reads it from this repo every 30 minutes, so merging a change here is all it takes to hand out a badge.

```json
{
    "123456789012345678": [
        {
            "tooltip": "Foldcord Founder",
            "badge": "https://raw.githubusercontent.com/ffolded/foldcord/main/branding/logo-original.webp"
        }
    ]
}
```

- `tooltip` is the name shown on hover and in the badge directory.
- `badge` must be an `https` image URL. Square images around 128px look best.
- A user can have several badges.

## Other client mods

The format is the same one Vencord and Equicord use for donor badges, so other mods can read this file as it is. A badge only shows up in another client once that client reads a list that includes you. Foldcord can't switch that on for them, so to get the Founder badge seen there, submit these entries to the GlobalBadges service (badges.equicord.org), which many mods already read.
