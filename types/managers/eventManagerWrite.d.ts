import { IChannelInfo, ICommunityBasicInfo, ICommunityInfo, IConversationPath, ILongFormContentInfo, INewCalendarEventPostInfo, INewChannelMessageInfo, INewCommunityPostInfo, INostrMetadataContent, INostrSubmitResponse, IRelayConfig, IUpdateCalendarEventInfo } from "../utils/interfaces";
import { INostrCommunicationManager } from "./communication";
interface ISocialEventManagerWrite {
    nostrCommunicationManagers: INostrCommunicationManager[];
    privateKey: string;
    updateContactList(content: string, contactPubKeys: string[]): Promise<void>;
    postNote(content: string, conversationPath?: IConversationPath): Promise<void>;
    deleteEvents(eventIds: string[]): Promise<INostrSubmitResponse[]>;
    updateCommunity(info: ICommunityInfo): Promise<INostrSubmitResponse[]>;
    updateChannel(info: IChannelInfo): Promise<INostrSubmitResponse[]>;
    updateUserBookmarkedChannels(channelEventIds: string[]): Promise<void>;
    submitChannelMessage(info: INewChannelMessageInfo): Promise<void>;
    updateUserBookmarkedCommunities(communities: ICommunityBasicInfo[]): Promise<void>;
    submitCommunityPost(info: INewCommunityPostInfo): Promise<void>;
    updateUserProfile(content: INostrMetadataContent): Promise<void>;
    sendMessage(receiver: string, encryptedMessage: string): Promise<void>;
    updateGroupKeys(identifier: string, groupKind: number, keys: string, invitees: string[]): Promise<INostrSubmitResponse[]>;
    updateCalendarEvent(info: IUpdateCalendarEventInfo): Promise<INostrSubmitResponse[]>;
    createCalendarEventRSVP(rsvpId: string, calendarEventUri: string, accepted: boolean): Promise<INostrSubmitResponse[]>;
    submitCalendarEventPost(info: INewCalendarEventPostInfo): Promise<INostrSubmitResponse[]>;
    submitLongFormContentEvents(info: ILongFormContentInfo): Promise<void>;
    submitLike(tags: string[][]): Promise<void>;
    submitRepost(content: string, tags: string[][]): Promise<void>;
    updateRelayList(relays: Record<string, IRelayConfig>): Promise<void>;
    createPaymentRequestEvent(paymentRequest: string, amount: string, comment: string): Promise<void>;
    createPaymentReceiptEvent(requestEventId: string, recipient: string, preimage: string, comment: string): Promise<void>;
}
declare class NostrEventManagerWrite implements ISocialEventManagerWrite {
    protected _nostrCommunicationManagers: INostrCommunicationManager[];
    protected _apiBaseUrl: string;
    protected _privateKey: string;
    constructor(managers: INostrCommunicationManager[], apiBaseUrl: string);
    set nostrCommunicationManagers(managers: INostrCommunicationManager[]);
    set privateKey(privateKey: string);
    protected calculateConversationPathTags(conversationPath: IConversationPath): string[][];
    updateContactList(content: string, contactPubKeys: string[]): Promise<void>;
    postNote(content: string, conversationPath?: IConversationPath): Promise<void>;
    deleteEvents(eventIds: string[]): Promise<INostrSubmitResponse[]>;
    updateChannel(info: IChannelInfo): Promise<INostrSubmitResponse[]>;
    updateUserBookmarkedChannels(channelEventIds: string[]): Promise<void>;
    updateCommunity(info: ICommunityInfo): Promise<INostrSubmitResponse[]>;
    updateUserBookmarkedCommunities(communities: ICommunityBasicInfo[]): Promise<void>;
    submitCommunityPost(info: INewCommunityPostInfo): Promise<void>;
    submitChannelMessage(info: INewChannelMessageInfo): Promise<void>;
    updateUserProfile(content: INostrMetadataContent): Promise<void>;
    sendMessage(receiver: string, encryptedMessage: string): Promise<void>;
    updateGroupKeys(identifier: string, groupKind: number, keys: string, invitees: string[]): Promise<INostrSubmitResponse[]>;
    updateCalendarEvent(info: IUpdateCalendarEventInfo): Promise<INostrSubmitResponse[]>;
    createCalendarEventRSVP(rsvpId: string, calendarEventUri: string, accepted: boolean): Promise<INostrSubmitResponse[]>;
    submitCalendarEventPost(info: INewCalendarEventPostInfo): Promise<INostrSubmitResponse[]>;
    submitLongFormContentEvents(info: ILongFormContentInfo): Promise<void>;
    submitLike(tags: string[][]): Promise<void>;
    submitRepost(content: string, tags: string[][]): Promise<void>;
    updateRelayList(relays: Record<string, IRelayConfig>): Promise<void>;
    createPaymentRequestEvent(paymentRequest: string, amount: string, comment: string): Promise<void>;
    createPaymentReceiptEvent(requestEventId: string, recipient: string, preimage: string, comment: string): Promise<void>;
}
export { NostrEventManagerWrite, ISocialEventManagerWrite };