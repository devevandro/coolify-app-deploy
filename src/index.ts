import axios from "axios";
import { getInput, setFailed } from "@actions/core";

export const run = async () => {
  try {
    const coolifyUrl = getInput("coolifyUrl");
    const coolifyToken = getInput("coolifyToken");
    const appUuid = getInput("coolifyAppUuid");
    const secrets = getInput("secrets");
    const secretToExclude = getInput("secretsToExclude");

    if (!coolifyUrl || !coolifyToken || !appUuid) {
      throw new Error("Missing required environment variables");
    }

    const api = axios.create({
      baseURL: coolifyUrl,
      headers: {
        Authorization: `Bearer ${coolifyToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(secrets, 'CACETE');
    if (secrets !== undefined) {
      const secretsParsed =
        typeof secrets === "string" ? JSON.parse(secrets) : secrets;
      const convertedJsonToArray = Object.entries(secretsParsed)
        .filter(([key]) => !secretToExclude.includes(key))
        .map(([key, value]) => ({
          key,
          value,
        }));

      console.log("Updating environment variables...");
      const body = {
        data: convertedJsonToArray,
      };
      const envUpdate = await api.patch(
        `/applications/${appUuid}/envs/bulk`,
        body
      );

      if (envUpdate.status !== 201) {
        throw new Error("Failed to update environment variables");
      }

      console.log("Updated environment variables successfully!");
    }

    console.log("Deploying application...");
    const restart = await api.post(`/deploy?uuid=${appUuid}`);

    if (restart.status !== 200) {
      throw new Error("Failed to restart application");
    }

    console.log("Deploy completed successfully!");
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
    throw error;
  }
};

run();
