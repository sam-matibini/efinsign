# eFinSign

Secure e-signature workspace with a PDF editor for adding text, shapes, signatures, and guides before you send a document.

## Run locally

```sh
npm i
npm run dev
```

The Vite app starts on port 8080 by default. Open Edit PDF on a document to use the editor:

- **Text** — Word-like fonts, italic, underline, strikethrough, text and background color, alignment, line spacing, and lists. Use **Save** on the text box (or Enter) to append the text and write it into the PDF so it is not lost. Drag, nudge, snap, and wrap still work.
- **Shape** — rectangle, rounded, circle, ellipse, line, triangle, diamond, and arrow. Type inside the shape (double-click or start typing after you draw it). Word ribbon styles, border, and fill apply to that same shape — not a second text box.
- **Signature** — place a sign-here box, then draw or type a signature.
- **Next** — drop a yellow sticky note that points people to the next sign or text action.

Save PDF still burns in-progress text and uses the existing storage fallback.

Signing review uses a full-height preview that fits each page to the window. Zoom, fit width/page, find, download, print, and full screen work like a typical e-sign reader. Required fields are listed on the left and jump to that page. After **Start signing**, a **Sign here** box is placed on the document (last page if none was prepared). Click it to draw or type the signature.

After signing, **Save signed document** writes the signed PDF. **Close** leaves the completion screen and returns to the dashboard (it cannot force-close a tab the browser opened). Company seals are chosen in **Settings**, can include a logo icon in the center, and are appended on prepare/fill-and-sign. Signatures and seals drag, snap, resize, and nudge left/right/up/down. Deploy the latest `supabase/migrations` so profile save and org seals persist in the hosted database.

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
