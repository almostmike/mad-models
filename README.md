# Mad Models

A short browser game about the history of prompting. You talk to three real language models from three eras of AI:

1. **ELIZA** at MIT, 1966, on a clacking printing terminal.
2. **GPT-1** in a San Francisco startup, 2018.
3. **GPT-2**, Valentine's Day 2019: "the model too dangerous to release," and suspiciously fond of vampire fanfiction.

The models are the real things. ELIZA is a faithful port of Weizenbaum's 1966 program and DOCTOR script. GPT-1 and GPT-2 are OpenAI's released weights, running in your browser. Nothing is sent to a server.

**Status:** under construction (Milestone 0). See [docs/PRD.md](docs/PRD.md) for the plan and [docs/VERIFICATION.md](docs/VERIFICATION.md) for the research behind it.

## Develop

```bash
npm install
npm run dev
```

```bash
npm test
```

Pushing to `main` runs the tests and deploys to GitHub Pages automatically. Live at https://almostmike.github.io/mad-models/.

## License

Code is MIT. Third-party assets and their licenses are listed in `docs/CREDITS.md` as they are added. The Twilight-themed content is parody.
