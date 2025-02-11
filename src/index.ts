import axios from "axios";
import { getInput, setFailed, info } from "@actions/core";

export const run = async () => {
  try {
    const coolifyUrl = getInput("coolifyUrl");
    const coolifyToken = getInput("coolifyToken");
    const appUuid = getInput("coolifyAppUuid");
    const secrets = getInput("secrets");
    const secretsToExclude = getInput("secretsToExclude") || [""];

    if (!coolifyUrl || !coolifyToken || !appUuid) {
      setFailed(
        new Error("Missing required environment variables") ?? "Unknown error"
      );
    }

    const api = axios.create({
      baseURL: coolifyUrl,
      headers: {
        Authorization: `Bearer ${coolifyToken}`,
        "Content-Type": "application/json",
      },
    });

    if (secrets && secrets !== undefined) {
      const secretsParsed =
        typeof secrets === "string" ? JSON.parse(secrets) : secrets;
      const convertedJsonToArray = Object.entries(secretsParsed)
        .filter(([key]) => !secretsToExclude.includes(key))
        .map(([key, value]) => ({
          key,
          value,
        }));

      info("Updating environment variables...");
      const body = {
        data: convertedJsonToArray,
      };
      const envUpdate = await api.patch(
        `/applications/${appUuid}/envs/bulk`,
        body
      );

      if (envUpdate.status !== 201) {
        setFailed(
          new Error("Failed to update environment variables") ?? "Unknown error"
        );
      }

      info("Updated environment variables successfully!");
    }

    info("Deploying application...");
    const restart = await api.post(`/deploy?uuid=${appUuid}`);
    const data = restart.data;
    const deploymentUuid = data.deployments[0].deployment_uuid;
    let deploymentStatus: "in_progress" | "finished" | "queued" | "failed";

    if (restart.status !== 200) {
      setFailed(new Error("Failed to restart application") ?? "Unknown error");
    }

    do {
      deploymentStatus = (await api.get(`/deployments/${deploymentUuid}`)).data
        .status;

      if (deploymentStatus === "failed") {
        setFailed(new Error("Failed to deploy application") ?? "Unknown error");
      }
    } while (deploymentStatus !== "finished");

    if (deploymentStatus === "finished") {
      info(`Deploy completed successfully!`);
    }
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
    throw error;
  }
};

run();
