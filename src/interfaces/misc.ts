import { IChannelInfo } from "./channel";
import { IConversationPath, INostrEvent, INostrMetadata, INoteInfo } from "./common";
import { INoteCommunity } from "./community";

export interface IUserProfile {
	id: string;
	username: string;
	description: string;
	avatar: string;
	npub: string;
	pubkey: string;
	displayName?: string;
	website?: string;
	banner?: string;
	internetIdentifier: string;
	followers?: number;
	lud16?: string;
	ethWallet?: string;
	telegramAccount?: string;
	metadata?: INostrMetadata;
}

export interface IUserActivityStats {
	notes: number;
	replies: number;
	followers: number;
	following: number;
	relays: number;
	timeJoined: number;
}

export interface IAuthor {
	id: string;
	username: string;
	description: string;
	avatar: string;
	pubKey?: string;
	displayName?: string;
	internetIdentifier: string;
}

export interface INoteInfoExtended extends INoteInfo {
	parentAuthor?: IAuthor;
	repost?: IAuthor;
	community?: INoteCommunity;
}

export enum ScpStandardId {
	Community = '1',
	CommunityPost = '2',
	Channel = '3',
	ChannelMessage = '4',
	GroupKeys = '5',
	CommerceStall = '6',
	CommerceOrder = '7',
}

export interface IMessageContactInfo {
	id: string;
	pubKey: string;
	creatorId: string;
	username: string;
	displayName: string;
	avatar?: string;
	banner?: string;
	latestAt?: number;
	cnt?: number;
	isGroup?: boolean;
	channelInfo?: IChannelInfo;
}

export enum CalendarEventType {
	DateBased = 'dateBased',
	TimeBased = 'timeBased'
}

export interface ICalendarEventBasicInfo {
	id: string;
	title: string;
	description: string;
	start: number;
	end?: number;
	startTzid?: string;
	endTzid?: string;
	type: CalendarEventType;
	location?: string;
	latitude?: number;
	longitude?: number;
	city?: string;
	image?: string;
}

export interface ICalendarEventInfo extends ICalendarEventBasicInfo {
	naddr: string;
	eventData?: INostrEvent;
	geohash?: string;
}

export interface IUpdateCalendarEventInfo extends ICalendarEventBasicInfo {
	geohash?: string;
	hostIds?: string[];
}

export interface ICalendarEventHost {
	pubkey: string;
	userProfile?: IUserProfile;
}

export interface ICalendarEventAttendee {
	pubkey: string;
	userProfile?: IUserProfile;
	rsvpEventData?: INostrEvent;
}

export interface ICalendarEventDetailInfo extends ICalendarEventInfo {
	hosts?: ICalendarEventHost[];
	attendees?: ICalendarEventAttendee[];
	notes?: INoteInfo[];
}

export interface INewCalendarEventPostInfo {
	calendarEventUri: string;
	message: string;
	conversationPath?: IConversationPath;
}

export interface ILocationCoordinates {
	latitude: number;
	longitude: number;
}

export interface ILongFormContentInfo {
	id: string;
	content: string;
	markdownContent: string;
	title?: string;
	image?: string;
	summary?: string;
	createdAt?: number;
	publishedAt?: number;
	eventData?: INostrEvent;
	hashtags?: string[];
}

export interface IRelayConfig {
	read: boolean;
	write: boolean;
}

//To be deleted
export interface IPaymentActivity {
	paymentHash: string;
	sender: string;
	recipient: string;
	amount: string;
	status: string;
	createdAt: number;
}

export interface IRewardsPoints {
	creatorId: string;
	communityId: string;
	points: number;
}

export interface IPaymentActivityV2 {
	id: string;
	sender: string;
	recipient: string;
	amount: string;
	currencyCode: string;
	networkCode?: string;
	stallId?: string;
	stallName?: string;
	orderId?: string;
	paymentMethod?: "Stripe" | "EVM" | "TON" | "RewardsPoints";
	referenceId?: string;
	createdAt?: number;
	rewardsPoints?: IRewardsPoints;
}

export interface IEthWalletAccountsInfo {
	masterWalletSignature: string;
	socialWalletSignature: string;
	encryptedKey: string;
	masterWalletHash: string;
	eventData?: INostrEvent;
}

export interface ISendTempMessageOptions {
	receiverId: string;
	message: string;
	replyToEventId?: string;
	widgetId?: string;
}

export interface IFetchPaymentActivitiesOptions {
	pubkey: string;
	stallId?: string;
	since?: number;
	until?: number;
}

export interface ITokenActivity {
	chainId: number;
	token: any;
	amount: string;
	creatorId?: string;
	communityId?: string;
	message?: string;
	action: string;
	status: string;
	createdAt: number;
}