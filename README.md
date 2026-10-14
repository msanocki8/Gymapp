# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside **src/app**. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Styling

The app uses [NativeWind](https://www.nativewind.dev/) with Tailwind CSS 3. Utility classes are applied with `className` in React Native components. Tailwind scans `src/` using `tailwind.config.js`, and the global stylesheet is loaded from `src/app/_layout.tsx`.

## Supabase accounts and saved plans

1. Create a Supabase project, then copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to that project's URL and publishable/anon key. These client values are public; never put a service-role key in the Expo app.
2. In Supabase Auth settings, disable public user sign-ups so accounts can only be created through the access-key-protected Edge Function. The server-side admin function can still create confirmed accounts.
3. Install and link the Supabase CLI, then apply the database schema with `supabase link --project-ref YOUR_PROJECT_REF` and `supabase db push`. The migration creates private account profiles and per-user workout plans with row-level security.
4. In the Supabase Dashboard, set the Edge Function secret `REGISTRATION_ACCESS_KEY` to the exact access key supplied for the app. Keep it in the server-side function environment; the registration function compares the unmodified input against this value.
5. Deploy the public registration function and authenticated nick-update function with `supabase functions deploy register --no-verify-jwt` and `supabase functions deploy update-nick`. The registration function validates the access key and creates confirmed password accounts using a non-deliverable internal email address derived from each unique nick. The service-role key is read only from Supabase's server environment.
6. Restart Expo after changing `.env` with `npx expo start -c`.

Nick names are case-insensitive and limited to 3–24 ASCII letters, digits, `_`, or `-`. Passwords must be 8–128 characters. Native clients persist the Supabase session in Expo SecureStore; web clients use browser local storage. User-created plans are fetched by the signed-in user's ID and the database RLS policies independently enforce the same ownership boundary.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
