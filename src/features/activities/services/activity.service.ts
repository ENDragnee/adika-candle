import { axiosInstance } from "@/lib/axios";
import type {
  ActivityFacetsDTO,
  ActivityPageDTO,
  ActivityQuery,
} from "../validators/activity.schema";

export async function FetchActivities(
  query: ActivityQuery,
): Promise<ActivityPageDTO> {
  const { data } = await axiosInstance.get<ActivityPageDTO>(
    "/api/v1/activities",
    { params: query },
  );
  return data;
}

export async function FetchActivityFacets(): Promise<ActivityFacetsDTO> {
  const { data } = await axiosInstance.get<ActivityFacetsDTO>(
    "/api/v1/activities/facets",
  );
  return data;
}
