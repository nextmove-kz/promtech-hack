/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	Diagnostics = "diagnostics",
	Objects = "objects",
	Pipelines = "pipelines",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export enum DiagnosticsMethodOptions {
	"VIK" = "VIK",
	"PVK" = "PVK",
	"MPK" = "MPK",
	"UZK" = "UZK",
	"RGK" = "RGK",
	"TVK" = "TVK",
	"VIBRO" = "VIBRO",
	"MFL" = "MFL",
	"TFI" = "TFI",
	"GEO" = "GEO",
	"UTWM" = "UTWM",
}

export enum DiagnosticsQualityGradeOptions {
	"удовлетворительно" = "удовлетворительно",
	"допустимо" = "допустимо",
	"требует_мер" = "требует_мер",
	"недопустимо" = "недопустимо",
}

export enum DiagnosticsMlLabelOptions {
	"normal" = "normal",
	"medium" = "medium",
	"high" = "high",
}
export type DiagnosticsRecord = {
	created: IsoAutoDateString
	date?: IsoDateString
	defect_description?: string
	defect_found?: boolean
	humidity?: number
	id: string
	illumination?: number
	method?: DiagnosticsMethodOptions
	ml_label?: DiagnosticsMlLabelOptions
	object?: RecordIdString
	param1?: number
	param2?: number
	param3?: number
	quality_grade?: DiagnosticsQualityGradeOptions
	temperature?: number
	updated: IsoAutoDateString
}

export enum ObjectsTypeOptions {
	"crane" = "crane",
	"compressor" = "compressor",
	"pipeline_section" = "pipeline_section",
}

export enum ObjectsHealthStatusOptions {
	"OK" = "OK",
	"WARNING" = "WARNING",
	"CRITICAL" = "CRITICAL",
}
export type ObjectsRecord = {
	ai_summary?: string
	conflict_detected?: boolean
	created: IsoAutoDateString
	health_status?: ObjectsHealthStatusOptions
	id: string
	last_analysis_at?: IsoAutoDateString
	lat?: number
	lon?: number
	material?: string
	name?: string
	pipeline?: RecordIdString
	recommended_action?: string
	type?: ObjectsTypeOptions
	updated: IsoAutoDateString
	urgency_score?: number
	year?: number
}

export type PipelinesRecord = {
	created: IsoAutoDateString
	id: string
	name: string
	updated: IsoAutoDateString
}

export type UsersRecord = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	name?: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type DiagnosticsResponse<Texpand = unknown> = Required<DiagnosticsRecord> & BaseSystemFields<Texpand>
export type ObjectsResponse<Texpand = unknown> = Required<ObjectsRecord> & BaseSystemFields<Texpand>
export type PipelinesResponse<Texpand = unknown> = Required<PipelinesRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	diagnostics: DiagnosticsRecord
	objects: ObjectsRecord
	pipelines: PipelinesRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	diagnostics: DiagnosticsResponse
	objects: ObjectsResponse
	pipelines: PipelinesResponse
	users: UsersResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
