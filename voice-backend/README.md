# Complete-recording transcription — prepared, not connected

`next-voice/` is the candidate frontend. Current main-page microphone remains unchanged until this backend is connected.

The candidate records a full audio clip with MediaRecorder, shows no partial transcript, uploads after stopping, then shows the complete text. The recording remains available for playback and retry after network or API failures. Text entry stays available.

`worker.mjs` is a dependency-free Cloudflare Worker-compatible proxy. Configure server secrets `OPENAI_API_KEY` and `DEMO_ACCESS_TOKEN`; optionally set `ALLOWED_ORIGIN` (defaults to `https://2ez4jz.github.io`) and `TRANSCRIPTION_MODEL` (defaults to the documented `gpt-transcribe`). It accepts `POST /api/transcribe` with raw audio and a bearer demo token, and returns `{text}`.

Only after deployment and successful real-audio verification, set the actual HTTPS backend origin in `next-voice/voice-config.js`. No secret belongs in that config. The demo passphrase is entered by the presenter and held only in browser sessionStorage.

Then port the tested candidate to the root page and bump all asset versions. Chat replies and record extraction remain the existing demo rules; this change upgrades audio capture and transcription only.

Current state: code prepared; no backend deployed, key provisioned, or live API call tested. No claim of improved accuracy has been verified yet.
