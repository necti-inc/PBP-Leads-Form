export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Pools by Pros",
  intakeUrl:
    process.env.NEXT_PUBLIC_INTAKE_URL ||
    "https://us-central1-pools-by-pros.cloudfunctions.net/leadIntake",
  intakeKey: process.env.NEXT_PUBLIC_INTAKE_KEY || "",
  phone: process.env.NEXT_PUBLIC_PHONE || "(951) 442-0992",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
};
