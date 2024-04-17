export type OnFailure = (
  message: string,
  { screenshotBuffer }: { screenshotBuffer?: Buffer }
) => void;
