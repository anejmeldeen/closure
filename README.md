This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Inspiration
We wanted to solve a real world problem that software teams face every day (so we went with prompt #3). Figuring out who is actually available to work is usually a frustrating guessing game. Company schedules are full of spotty data and scattered calendars. We realized that fixing this scheduling chaos was the perfect challenge for us to tackle.

## What it does
Closure answers the question of "who does what." It guides managers to an optimized task assignment plan based on real-time bandwidth. The app syncs directly with Google Calendar and logs employee free days. It then uses this data to pinpoint the best person for a specific project. We also built in chat rooms for team coordination, manual task assignment, and an interactive whiteboard. The whiteboard can even auto-generate tasks and assign them to the most under-utilized personnel.

## How we built it
We built our dynamic dashboard using Next.js and React Server Components. This keeps the platform fast and scalable. For our backend, we used Supabase to store user profiles and availability data. We used OpenRouter to access Gemini image completion and reasoning models to analyze the whiteboard inputs. We also designed a completely custom user interface featuring unique corkboard textures.

## Challenges we ran into
Collaborating closely meant we ran into version control conflicts from working on the same files simultaneously. We also faced hurdles when designing a universal database schema. It took careful planning to structure our Supabase tables so they could cleanly handle users, availability slots, and project tasks all in one unified system.

## Accomplishments that we're proud of
We collaborated to build a comprehensive tool that actually feels like a production ready application. We successfully incorporated advanced AI models alongside a beautiful custom user interface and highly unique features like the interactive whiteboard. We created a custom hybrid algorithm that uses both data and computations with generative AI to best allocate and spread user work hours on tasks.

## What we learned
We learned how to effectively split up work as a software team. Ironically, building an app about task delegation taught us how to efficiently break down our own massive project goals into smaller and manageable tasks.

## What's next for Closure
We plan to polish Closure into a real product and make it publicly available. We aim to make our existing data pipelines more comprehensive so the AI assignments become even smarter. Ultimately, we want to scale the architecture to support massive organizations and their complex internal team structures.
