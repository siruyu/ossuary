# Ossuary

A digital graveyard for failed software projects — where dead code goes to live forever.


## The Concept

Ossuary is a platform for preserving and discovering abandoned/dead software projects. Instead of deleting failed repos or letting them disappear into the void, users can "bury" them in a communal mausoleum — preserving them as learning artifacts, warnings, or digital monuments.

**The Vibe**: Terminal/macabre aesthetic with necromancy, death, and decay metaphors.

---

## Features

### 🪦 Bury a Project
Submit a failed repository with details:
- Repository name & URL
- What went wrong (failure mode)
- Tech stack, tags, obituary
- Tech stack details

### 🔍 Explore the Mausoleum
Browse all buried projects:
- User-submitted projects (buried by community)
- GitHub-discovered abandoned repos
- Search by name, filter by cause of death
- View project details in the Extract page

### 💀 Necromancer Profile
- Track your buried count
- Level up based on activity (NOVICE → INITIATE → APPRENTICE → MASTER)
- Customizable profile with title, bio, avatar

### ⚙️ Settings
- Account configuration
- Theme customization (VOID, SLATE, ASH)
- Alert preferences
- Font family selection

### ⚠️ Danger Zone
- Permanently terminate your account and erase all data

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite + Prisma ORM
- **Authentication**: NextAuth.js 5.x
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **GitHub API**: Octokit

---


## Project Structure

```
ossuary/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── dev.db           # SQLite database
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── api/        # API routes
│   │   ├── necromancer/# Profile page
│   │   ├── ritual/     # Bury projects
│   │   ├── repository/ # GitHub repos
│   │   ├── settings/   # User settings
│   │   └── page.tsx    # Mausoleum (home)
│   ├── components/     # React components
│   │   ├── ConfigNecromancer.tsx
│   │   ├── Mausoleum.tsx
│   │   ├── NecromancerPage.tsx
│   │   ├── RitualPage.tsx
│   │   └── ...
│   ├── lib/            # Utilities
│   │   ├── db.ts       # Prisma client
│   │   ├── github.ts   # GitHub API helpers
│   │   └── data.ts     # Static data
│   └── auth.ts         # NextAuth configuration
├── public/             # Static assets
├── .env                # Environment variables
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/profile` | GET/PATCH/DELETE | User profile CRUD |
| `/api/burial` | POST/GET | Bury/list projects |
| `/api/mausoleum` | GET | Search projects (GitHub + local) |
| `/api/loot` | GET/POST | Treasure/achievements |
| `/api/github/repos` | GET | Fetch user's GitHub repos |
| `/api/notifications` | GET/PUT | User notifications |

---

## User Roles & Progression

| Rank | Title | Requirement |
|------|-------|-------------|
| NOVICE | Apprentice | 0 buried |
| INITIATE | Mortician | 2+ buried |
| APPRENTICE | Necromancer | 5+ buried |
| MASTER | Arch-Necromancer | 10+ buried |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License — do whatever you want with this code.

---

## Acknowledgments

- Next.js team for the amazing framework
- GitHub API for enabling repo discovery
- The concept of digital preservation and "failed project" archives

---

> *"In the land of the dead, every project has a story."*
> — The Ossuary Chronicle
