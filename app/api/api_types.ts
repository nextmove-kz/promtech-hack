/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Resume = "resume",
	Users = "users",
	Vacancy = "vacancy",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export enum ResumeStatusOptions {
	"reject" = "reject",
	"accept" = "accept",
}

export enum ResumeAcceptedOptions {
	"invite" = "invite",
	"hire" = "hire",
}
export type ResumeRecord = {
	accepted?: ResumeAcceptedOptions
	city?: string
	cons?: string
	contactData?: string
	education?: boolean
	experience?: string
	fullName?: string
	jobName?: string
	pros?: string
	rating?: number
	resume?: string
	resumeHard?: string
	resumeSoft?: string
	setMark?: number
	status?: ResumeStatusOptions
	summary?: string
	vacancy?: RecordIdString
}

export type UsersRecord = {
	avatar?: string
	name?: string
}

export enum VacancyEmploymentTypeOptions {
	"full_time" = "full_time",
	"part_time" = "part_time",
	"project" = "project",
	"voluntary" = "voluntary",
	"internship" = "internship",
}

export enum VacancyExperienceOptions {
	"none" = "none",
	"1-3" = "1-3",
	"3-6" = "3-6",
	"6+" = "6+",
}
export type VacancyRecord = {
	archive?: boolean
	city?: string
	description?: HTMLString
	employment_type?: VacancyEmploymentTypeOptions
	experience?: VacancyExperienceOptions
	resume?: RecordIdString[]
	title: string
}

// Response types include system fields and match responses from the PocketBase API
export type ResumeResponse<Texpand = unknown> = Required<ResumeRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>
export type VacancyResponse<Texpand = unknown> = Required<VacancyRecord> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	resume: ResumeRecord
	users: UsersRecord
	vacancy: VacancyRecord
}

export type CollectionResponses = {
	resume: ResumeResponse
	users: UsersResponse
	vacancy: VacancyResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'resume'): RecordService<ResumeResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
	collection(idOrName: 'vacancy'): RecordService<VacancyResponse>
}
