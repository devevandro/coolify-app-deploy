import axios, { AxiosInstance } from "axios";
import { getInput, setFailed } from "@actions/core";

export const run = async () => {
  try {
    const coolifyUrl = getInput("coolifyUrl");
    const coolifyToken = getInput("coolifyToken");
    const appUuid = getInput("coolifyAppUuid");
    const secrets = getInput("secrets") || "{}";
    const secretToExclude = getInput("secretsToExclude") || [""];

    if (!coolifyUrl || !coolifyToken || !appUuid) {
      errorConstructor("Missing required environment variables");
    }

    const secretsParsed =
      typeof secrets === "string" ? JSON.parse(secrets) : secrets;

    const api = baseApi(coolifyUrl, coolifyToken);

    if (secretsParsed.length > 0) {
      logMessage("Updating environment variables...");
      const body = {
        data: convertedJsonToArray(secretsParsed, secretToExclude),
      };
      const envUpdate = await api.patch(
        `/applications/${appUuid}/envs/bulk`,
        body
      );

      if (envUpdate.status !== 201) {
        errorConstructor("Failed to update environment variables");
      }

      logMessage("Updated environment variables successfully!");
    }

    logMessage("Restarting application...");
    const { status } = await api.post(`/deploy?uuid=${appUuid}`);

    if (status !== 200) {
      errorConstructor("Failed to restart application");
    }

    logMessage("Deploy completed successfully!");
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
    throw error;
  }
};

run();

type Result = {
  key: string;
  value: unknown;
}[];

const convertedJsonToArray = (
  secretsParsed: string,
  secretToExclude: string | string[]
): Result => {
  return Object.entries(secretsParsed)
    .filter(([key]) => !secretToExclude.includes(key))
    .map(([key, value]) => ({
      key,
      value,
    }));
};

const baseApi = (coolifyUrl: string, coolifyToken: string): AxiosInstance => {
  const api = axios.create({
    baseURL: coolifyUrl,
    headers: {
      Authorization: `Bearer ${coolifyToken}`,
      "Content-Type": "application/json",
    },
  });

  return api;
};

const errorConstructor = (message: string): never => {
  throw new Error(message);
};

const logMessage = (message: string): void => {
  console.log(message);
};
