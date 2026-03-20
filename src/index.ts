import axios from "axios";
import { getInput, setFailed, info } from "@actions/core";
import { generateHour } from "./utils";

enum DEPLOYMENT_STATUS {
  IN_PROGRESS = "in_progress",
  FINISHED = "finished",
  QUEUED = "queued",
  FAILED = "failed",
}

export const run = async () => {
  try {
    const coolifyUrl = getInput("coolify_url");
    const coolifyToken = getInput("coolify_token");
    const appUuid = getInput("coolify_app_uuid");
    const secrets = getInput("secrets");
    const secretsToExclude = getInput("secrets_to_exclude");

    if (!coolifyUrl || !coolifyToken || !appUuid) {
      const hour = generateHour();
      setFailed(
        new Error(`${hour} INFO: Missing required environment variables`) ?? "Unknown error"
      );
      return;
    }

    const api = axios.create({
      baseURL: coolifyUrl,
      headers: {
        Authorization: `Bearer ${coolifyToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    try {
      const urlReplaced = coolifyUrl.replace("v1", "health");
      await api.get(urlReplaced);
      const hour = generateHour();
      info(`${hour} INFO: Authentication successful!`);
    } catch (error) {
      const hour = generateHour();
      const errorMessage = axios.isAxiosError(error)
        ? `${error.response?.status} - ${error.response?.statusText}`
        : "Unknown error";
      setFailed(
        new Error(`${hour} INFO: Error when performing authentication! ${errorMessage}`) ??
          "Unknown error"
      );
      return;
    }

    if (secrets && secrets !== undefined) {
      let secretsParsed;
      try {
        secretsParsed =
          typeof secrets === "string" ? JSON.parse(secrets) : secrets;
      } catch (parseError) {
        const hour = generateHour();
        setFailed(
          new Error(`${hour} INFO: Failed to parse secrets JSON!`) ?? "Unknown error"
        );
        return;
      }

      const excludeList = secretsToExclude ? JSON.parse(secretsToExclude || "[]") : [];
      const convertedJsonToArray = Object.entries(secretsParsed)
        .filter(([key]) => !excludeList.includes(key))
        .map(([key, value]) => ({
          key,
          value,
          is_literal: key === "MYSQL_PASSWORD" ? true : false,
        }));

      const hour = generateHour();
      info(`${hour} INFO: Updating environment variables...`);
      const body = {
        data: convertedJsonToArray,
      };
      const envUpdate = await api.patch(
        `/applications/${appUuid}/envs/bulk`,
        body
      );

      if (envUpdate.status !== 201) {
        setFailed(
          new Error(`${hour} INFO: Failed to update environment variables`) ??
            "Unknown error"
        );
        return;
      }

      info(`${hour} INFO: Updated environment variables successfully!`);
    }

    const hour = generateHour();
    info(`${hour} INFO: Deploying application...`);
    const restart = await api.post(`/deploy?uuid=${appUuid}`);
    const deploymentUuid = restart?.data?.deployments[0]?.deployment_uuid;
    let deploymentStatus: DEPLOYMENT_STATUS;
    let iterationCount = 0;
    let failureCount = 0;

    if (restart.status !== 200) {
      const hour = generateHour();
      setFailed(
        new Error(`${hour} INFO: Failed to restart application`) ??
          "Unknown error"
      );
      return;
    }

    do {
      deploymentStatus = (await api.get(`/deployments/${deploymentUuid}`))?.data
        ?.status;
      iterationCount++;

      if (iterationCount % 8 === 0) {
        const hour = generateHour();
        info(`${hour} INFO: Deployment status ${deploymentStatus}`);
      }

      if (deploymentStatus === DEPLOYMENT_STATUS.FAILED) {
        failureCount++;
        if (failureCount >= 3) {
          const hour = generateHour();
          setFailed(
            new Error(`${hour} INFO: Failed to deploy application`) ??
              "Unknown error"
          );
          return;
        }
      } else {
        failureCount = 0;
      }

      const baseDelay = 2000;
      const maxDelay = 25000;
      const delay =
        Math.min(baseDelay * Math.pow(2, iterationCount), maxDelay) *
        (0.8 + Math.random() * 0.4);

      await new Promise((resolve) => setTimeout(resolve, delay));
    } while (deploymentStatus !== DEPLOYMENT_STATUS.FINISHED);

    if (deploymentStatus === DEPLOYMENT_STATUS.FINISHED) {
      const hour = generateHour();
      info(
        `${hour} INFO: Deployment status: ${deploymentStatus}\n${hour} INFO: Application deployed successfully! 🚀`
      );
    }
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
    throw error;
  }
};

run();
