import axios from "axios";
import { getInput, setFailed, info } from "@actions/core";

enum DEPLOYMENT_STATUS {
  IN_PROGRESS = "in_progress",
  FINISHED = "finished",
  QUEUED = "queued",
  FAILED = "failed",
}

export const run = async () => {
  try {
    const coolifyUrl = getInput("coolifyUrl");
    const coolifyToken = getInput("coolifyToken");
    const appUuid = getInput("coolifyAppUuid");
    const secrets = getInput("secrets") || "{}";
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

    try {
      const urlReplaced = coolifyUrl.replace("v1", "health");
      await api.get(urlReplaced);
      info("Authentication successful!");
    } catch (error) {
      setFailed(
        new Error("Error when performing authentication!") ?? "Unknown error"
      );
    }

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
    const deploymentUuid = restart?.data?.deployments[0]?.deployment_uuid;
    let deploymentStatus: DEPLOYMENT_STATUS;
    let iterationCount = 0;

    if (restart.status !== 200) {
      setFailed(new Error("Failed to restart application") ?? "Unknown error");
    }

    do {
      deploymentStatus = (await api.get(`/deployments/${deploymentUuid}`))?.data
        ?.status;
      iterationCount++;

      if (iterationCount % 8 === 0) {
        info(`Deployment status... ${deploymentStatus}`);
      }

      if (deploymentStatus === DEPLOYMENT_STATUS.FAILED) {
        setFailed(new Error("Failed to deploy application") ?? "Unknown error");
      }

      const baseDelay = 2000;
      const maxDelay = 30000;
      const delay =
        Math.min(baseDelay * Math.pow(2, iterationCount), maxDelay) *
        (0.8 + Math.random() * 0.4);

      await new Promise((resolve) => setTimeout(resolve, delay));
    } while (deploymentStatus !== DEPLOYMENT_STATUS.FINISHED);

    if (deploymentStatus === DEPLOYMENT_STATUS.FINISHED) {
      info(
        `Deployment status: ${deploymentStatus}\nDeploy completed successfully!`
      );
    }
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
    throw error;
  }
};

run();
