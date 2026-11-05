# Lioda9130 — Personal website

A simple, responsive introduction to Lioda9130 and a home for future web projects.

Website: https://lioda9130.github.io/

## Structure

- `docs/index.html`: homepage content, metadata, and structured data
- `docs/styles.css`: responsive layout and styles
- `docs/favicon.svg`: site icon
- `docs/robots.txt` and `docs/sitemap.xml`: search discovery
- `docs/404.html`: missing-page response

Buildless HTML and CSS. No package installation or JavaScript runtime is required by the website.

## Preview

With Python installed, run from the repository directory:

```powershell
python -m http.server 8000 --directory docs
```

Open http://localhost:8000/ in a browser. Stop with Ctrl+C.

## Publish changes

GitHub Pages publishes the `docs` folder on the `main` branch. Commit and push changes to update the website. Check the repository Actions tab for the deployment result.

```powershell
git add -- docs README.md
git commit -m "Update website"
git push origin main
```

## Google Search Console

Publication and Google indexing are separate steps. Neither indexing nor ranking is guaranteed.

1. Sign in to https://search.google.com/search-console/ with your own Google account.
2. Add a URL-prefix property for `https://lioda9130.github.io/`.
3. Choose HTML file verification and place the provided file, unchanged, in `docs/`. Alternatively, add the supplied verification meta tag inside the homepage `<head>`.
4. Commit and push, wait for deployment, then verify ownership in Search Console.
5. Submit `sitemap.xml` in Sitemaps.
6. Inspect `https://lioda9130.github.io/` and request indexing. Monitor the indexing report for results.

Never commit passwords or access tokens. A Search Console verification file or meta tag is intended to be public.

Official guidance: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
