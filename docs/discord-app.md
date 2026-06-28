# Custom Discord app

Works out of the box against a default **Pi** application. To use your own name
and art (or if the default's assets change), create your own app:

1. <https://discord.com/developers/applications> → New Application → name it
   (this is the bold "Playing **<name>**" line). Copy the **Application ID**
   (the client ID — a public value, not a secret).
2. Rich Presence → Art Assets: upload `pi_logo` (large) and small language icons
   `ts`, `js`, `python`, `rust`, `go`, `json`, `markdown`, `shell`, `lua`,
   `toml`, `yaml`. Missing keys simply render without that icon.
3. Provide the ID via env `PI_DISCORD_CLIENT_ID=<id>` or config.

> The Discord client must be running. If it isn't, the extension stays silent
> and reconnects on the next activity — it never errors or blocks Pi.
