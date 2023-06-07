import { TRegistration } from "./registrations";
import { TSeasonWithRegistrations } from "./seasons";
import { TUser } from "./users";

export type TCurrentUser = TUser & {
  registrations: TCurrentRegistration[];
};

export type TCurrentRegistration = TRegistration;

export type TCurrentSeason = TSeasonWithRegistrations;
