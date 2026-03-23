# ClosetAI

ClosetAI is a web-based wardrobe assistant that helps users organize their clothing and generate outfit recommendations from the items they already own. Users can create an account, upload and manage wardrobe items, receive AI-assisted clothing analysis, generate outfit suggestions with explanations, save favourite outfits, and refine recommendations using context such as weather. :contentReference[oaicite:0]{index=0} :contentReference[oaicite:1]{index=1}

## Live App

Frontend: `https://joinclosetai.com`

## Features

### F1. User Account Management
- Sign up, log in, log out
- Protected routes and session-based authentication
- Email verification and password reset support

### F2. Digital Wardrobe Management
- Upload clothing images
- View, edit, and delete wardrobe items
- AI-assisted metadata suggestions such as clothing type, colour, season, and style
- Duplicate detection with override flow

### F3. Outfit Recommendation Generation
- Generate outfit recommendations using the user’s stored wardrobe
- Provide explanations for why an outfit works
- Support occasion- and aesthetic-based outfit generation

### F4. Outfit Favourites
- Save favourite outfits
- View and remove saved outfits

### F5. Context-Based Outfit Generation
- Refine outfit suggestions using weather conditions
- Improve layering and outfit suitability based on context

These features align with the ClosetAI project requirements from Assignment 1 and the implemented system shown in Assignment 4. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}

## Tech Stack

### Frontend
- React
- CSS
- Session-aware client state
- Playwright for end-to-end testing

### Backend
- Node.js
- Express
- Session cookie authentication
- AI-assisted analysis and outfit generation
- File upload support

### Deployment
- Frontend hosted on Vercel
- Backend hosted on Railway
- Persistent storage for database and uploads
- Transactional email support for auth flows
