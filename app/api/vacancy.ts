import { VacancyRecord } from "./api_types";
import clientPocketBase from "./client_pb";
import { pocketbase } from "./pocketbase";

export const createVacancy = async (vacancy: any) => {
  try {
    const data = await clientPocketBase.collection("vacancy").create(vacancy);
    return data;
  } catch (error) {
    return null;
  }
};

export const viewVacancy = async () => {
  try {
    const data = await clientPocketBase.collection("vacancy").getFullList();

    return data;
  } catch (error) {
    return null;
  }
};

export const archiveById = async (id: string) => {
  const data = {
    archive: true,
  };
  return await clientPocketBase.collection("vacancy").update(id, data);
};

export const disArchiveById = async (id: string) => {
  const data = {
    archive: false,
  };
  return await clientPocketBase.collection("vacancy").update(id, data);
};

export const vacancyById = async (id: string) => {
  return await clientPocketBase.collection("vacancy").getOne(id);
};

export const updateVacancy = async (id: string, data: VacancyRecord) => {
  return await clientPocketBase.collection("vacancy").update(id, data);
};
