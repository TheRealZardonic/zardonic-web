# ZARDONIC - Industrial Artist Landing Page

A cyberpunk-themed landing page for electronic/industrial artist ZARDONIC, featuring admin authentication, edit mode, and Google Drive image caching.

## 🚀 Features

- **Admin Authentication System** - Password-protected edit mode with SHA-256 hashing
- **Edit Mode** - Full WYSIWYG editing capabilities for all content
- **Google Drive Integration** - Automatic image caching and URL conversion for Google Drive links
- **Cyberpunk UI** - Industrial-themed design with glitch effects and animations
- **Mobile Responsive** - Optimized for all device sizes

## 🔐 Admin Features

### First-Time Setup

1. Navigate to `?admin-setup` in your browser (e.g., `http://localhost:5173/?admin-setup`)
2. Set your admin password (minimum 6 characters)
3. You'll be automatically logged in

### Login

- Click the "Login" button in the header
- Enter your admin password
- Edit mode will become available

### Edit Mode

Once authenticated, click the pencil icon to enter edit mode. You can:

- ✏️ Edit artist name
- 📝 Edit biography
- 🖼️ Upload hero images
- 🎵 Add/edit releases with artwork and streaming links
- 📅 Add/edit gig information
- 🎨 Add gallery images (file upload or Google Drive URL)
- 👥 Manage band members
- 📁 Upload media files
- 🔗 Edit social media links

### Google Drive Image Support

Images can be added via:
1. **File Upload** - Upload from your device
2. **Google Drive URL** - Paste a Google Drive share link

Supported Google Drive URL formats:
- `https://drive.google.com/file/d/{fileId}/view`
- `https://drive.google.com/open?id={fileId}`
- `https://drive.google.com/uc?export=view&id={fileId}`
- `https://lh3.googleusercontent.com/d/{fileId}`

All Google Drive URLs are automatically converted to use the `wsrv.nl` proxy for optimal loading and CORS support.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run tests
npm test
```

## 📦 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible components
- **IndexedDB** - Image caching
- **localStorage** - Data persistence

## 🔒 Security

- Passwords are hashed using SHA-256 before storage
- Admin tokens stored in localStorage
- Edit mode protected behind authentication
- No sensitive data exposed in client code

## 📄 License

For Spark Template Resources: MIT License, Copyright GitHub, Inc.
