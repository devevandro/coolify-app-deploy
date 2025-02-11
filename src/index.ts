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
      throw new Error("Missing required environment variables");
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
    info(`antes do DO ${appUuid}`);
    // const data = restart.data;
    // const deploymentUuid = data.deployments[0].deployment_uuid;
    // let deploymentStatus = '';

    // if (restart.status !== 200) {
    //   throw new Error("Failed to restart application");
    // }

    // do {
      // const response = await api.get(`/deployments/${deploymentUuid}`);
      // console.log(`API Response:`, response.data);
      // deploymentStatus = response.data.status;
      // console.log(`Deployment status: ${deploymentStatus}`);
    // } while (deploymentStatus !== 'finished');

    info(`Deploy completed successfully!`);
  } catch (error) {
    setFailed((error as Error)?.message ?? "Unknown error");
    throw error;
  }
};

run();
