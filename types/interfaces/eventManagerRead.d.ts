import { IFetchPaymentActivitiesOptions, IPaymentActivity, ITokenActivity } from "./misc";
import { Nip19 } from "../core/index";
import { ICommunityBasicInfo, ICommunityInfo, ICommunityMember, IUserCommunityScore, IUserCommunityScoreLog } from "./community";
import { IAllUserRelatedChannels } from "./channel";
import { INostrCommunicationManager, INostrRestAPIManager, INostrEvent, INostrFetchEventsResponse } from "./common";
import { BuyerOrderStatus, IReservation, SellerOrderStatus } from "./marketplace";
export interface IFetchNotesOptions {
    authors?: string[];
    ids?: string[];
}
export declare namespace SocialEventManagerReadOptions {
    interface IFetchThreadCacheEvents {
        id: string;
        pubKey?: string;
    }
    interface IFetchTrendingCacheEvents {
        pubKey?: string;
    }
    interface IFetchProfileFeedCacheEvents {
        userPubkey: string;
        pubKey: string;
        since?: number;
        until?: number;
    }
    interface IFetchProfileRepliesCacheEvents {
        userPubkey: string;
        pubKey: string;
        since?: number;
        until?: number;
    }
    interface IFetchHomeFeedCacheEvents {
        pubKey?: string;
        since?: number;
        until?: number;
    }
    interface IFetchUserProfileCacheEvents {
        pubKeys: string[];
    }
    interface IFetchUserProfileDetailEvents {
        pubKey?: string;
        telegramAccount?: string;
    }
    interface IFetchContactListCacheEvents {
        pubKey: string;
        detailIncluded?: boolean;
    }
    interface IFetchUserRelays {
        pubKey: string;
    }
    interface IFetchFollowersCacheEvents {
        pubKey: string;
    }
    interface IFetchCommunities {
        pubkeyToCommunityIdsMap?: Record<string, string[]>;
        query?: string;
    }
    interface IFetchAllUserRelatedCommunities {
        pubKey: string;
    }
    interface IFetchAllUserRelatedCommunitiesFeed {
        pubKey: string;
        since?: number;
        until?: number;
    }
    interface IFetchUserBookmarkedCommunities {
        pubKey: string;
        excludedCommunity?: ICommunityInfo;
    }
    interface IFetchCommunity extends ICommunityBasicInfo {
    }
    interface IFetchCommunityFeed {
        communityUri: string;
        since?: number;
        until?: number;
    }
    interface IFetchCommunitiesFeed {
        communityUriArr: string[];
        since?: number;
        until?: number;
    }
    interface IFetchCommunityDetailMetadata {
        communityCreatorId: string;
        communityName: string;
    }
    interface IFetchCommunitiesGeneralMembers {
        communities: ICommunityBasicInfo[];
    }
    interface IFetchNotes {
        options: IFetchNotesOptions;
    }
    interface IFetchEventsByIds {
        ids: string[];
    }
    interface IFetchTempEvents {
        ids: string[];
    }
    interface IFetchAllUserRelatedChannels {
        pubKey: string;
    }
    interface IFetchUserBookmarkedChannelEventIds {
        pubKey: string;
    }
    interface IFetchChannelMessages {
        channelId: string;
        since?: number;
        until?: number;
    }
    interface IFetchChannelInfoMessages {
        channelId: string;
    }
    interface IFetchMessageContactsCacheEvents {
        pubKey: string;
    }
    interface IFetchDirectMessages {
        pubKey: string;
        sender: string;
        since?: number;
        until?: number;
    }
    interface IResetMessageCount {
        pubKey: string;
        sender: string;
    }
    interface IFetchGroupKeys {
        identifiers: string[];
    }
    interface IFetchUserGroupInvitations {
        groupKinds: number[];
        pubKey: string;
    }
    interface IFetchCalendarEventPosts {
        calendarEventUri: string;
    }
    interface IFetchCalendarEvents {
        start: number;
        end?: number;
        limit?: number;
        previousEventId?: string;
    }
    interface IFetchCalendarEvent {
        address: Nip19.AddressPointer;
    }
    interface IFetchCalendarEventRSVPs {
        calendarEventUri: string;
        pubkey?: string;
    }
    interface IFetchLongFormContentEvents {
        pubKey?: string;
        since?: number;
        until?: number;
    }
    interface ISearchUsers {
        query: string;
    }
    interface IFetchPaymentRequestEvent {
        paymentRequest: string;
    }
    interface IFetchPaymentReceiptEvent {
        requestEventId: string;
    }
    interface IFetchPaymentActivitiesForRecipient {
        pubkey: string;
        since?: number;
        until?: number;
    }
    interface IFetchPaymentActivitiesForSender {
        pubkey: string;
        since?: number;
        until?: number;
    }
    interface IFetchUserFollowingFeed {
        pubKey: string;
        until?: number;
    }
    interface IFetchCommunityPinnedNotesEvents extends ICommunityBasicInfo {
    }
    interface IFetchCommunityPinnedNoteIds extends ICommunityBasicInfo {
    }
    interface IFetchUserPinnedNotes {
        pubKey: string;
    }
    interface IFetchUserBookmarks {
        pubKey: string;
    }
    interface IFetchUserEthWalletAccountsInfo {
        walletHash?: string;
        pubKey?: string;
    }
    interface IFetchSubcommunites {
        communityCreatorId: string;
        communityName: string;
    }
    interface IFetchCommunityStalls extends ICommunityBasicInfo {
    }
    interface IFetchCommunityProducts extends ICommunityBasicInfo {
        stallId?: string;
    }
    interface IFetchCommunityOrders extends ICommunityBasicInfo {
        stallId?: string;
        since?: number;
        until?: number;
        status?: SellerOrderStatus;
    }
    interface IFetchBuyerOrders {
        pubkey: string;
        since?: number;
        until?: number;
        status?: BuyerOrderStatus;
    }
    interface IFetchMarketplaceOrderDetails {
        orderId: string;
    }
    interface IFetchMarketplaceProductDetails {
        stallId: string;
        productIds: string[];
    }
    interface IFetchPaymentActivities extends IFetchPaymentActivitiesOptions {
    }
    interface IFetchMarketplaceProductKey {
        sellerPubkey: string;
        productId: string;
    }
    interface IFetchProductPurchaseStatus {
        sellerPubkey: string;
        productId: string;
    }
    interface IFetchReservationsByRole {
        role: 'provider' | 'user';
        since?: number;
        until?: number;
    }
    interface IFetchCommunityLeaderboard extends ICommunityBasicInfo {
    }
    interface IFetchUserCommunityScores {
        pubKey: string;
        creatorId?: string;
        communityId?: string;
    }
    interface IFetchUserCommunityScoreLogs extends ICommunityBasicInfo {
        pubKey: string;
    }
    interface IFetchStakeRequestEvent {
        pubkey: string;
        since?: number;
        until?: number;
    }
    interface IFetchUserAgents {
        pubkey: string;
        name?: string;
    }
}
export interface ISocialEventManagerReadResult {
    error?: string;
    events?: INostrEvent[];
    data?: any;
}
export interface ISocialEventManagerRead {
    nostrCommunicationManager: INostrCommunicationManager | INostrRestAPIManager;
    privateKey: string;
    fetchThreadCacheEvents(options: SocialEventManagerReadOptions.IFetchThreadCacheEvents): Promise<INostrEvent[]>;
    fetchTrendingCacheEvents(options: SocialEventManagerReadOptions.IFetchTrendingCacheEvents): Promise<INostrEvent[]>;
    fetchProfileFeedCacheEvents(options: SocialEventManagerReadOptions.IFetchProfileFeedCacheEvents): Promise<INostrEvent[]>;
    fetchProfileRepliesCacheEvents(options: SocialEventManagerReadOptions.IFetchProfileRepliesCacheEvents): Promise<INostrEvent[]>;
    fetchHomeFeedCacheEvents(options: SocialEventManagerReadOptions.IFetchHomeFeedCacheEvents): Promise<INostrEvent[]>;
    fetchUserProfileCacheEvents(options: SocialEventManagerReadOptions.IFetchUserProfileCacheEvents): Promise<INostrEvent[]>;
    fetchUserProfileDetailEvents(options: SocialEventManagerReadOptions.IFetchUserProfileDetailEvents): Promise<INostrEvent[]>;
    fetchContactListCacheEvents(options: SocialEventManagerReadOptions.IFetchContactListCacheEvents): Promise<INostrEvent[]>;
    fetchUserRelays(options: SocialEventManagerReadOptions.IFetchUserRelays): Promise<INostrEvent[]>;
    fetchFollowersCacheEvents(options: SocialEventManagerReadOptions.IFetchFollowersCacheEvents): Promise<INostrEvent[]>;
    fetchCommunities(options: SocialEventManagerReadOptions.IFetchCommunities): Promise<INostrEvent[]>;
    fetchAllUserRelatedCommunities(options: SocialEventManagerReadOptions.IFetchAllUserRelatedCommunities): Promise<INostrEvent[]>;
    fetchAllUserRelatedCommunitiesFeed(options: SocialEventManagerReadOptions.IFetchAllUserRelatedCommunitiesFeed): Promise<INostrEvent[]>;
    fetchUserBookmarkedCommunities(options: SocialEventManagerReadOptions.IFetchUserBookmarkedCommunities): Promise<ICommunityBasicInfo[]>;
    fetchCommunity(options: SocialEventManagerReadOptions.IFetchCommunity): Promise<INostrEvent[]>;
    fetchCommunityFeed(options: SocialEventManagerReadOptions.IFetchCommunityFeed): Promise<INostrEvent[]>;
    fetchCommunityDetailMetadata(options: SocialEventManagerReadOptions.IFetchCommunityDetailMetadata): Promise<INostrEvent[]>;
    fetchEventsByIds(options: SocialEventManagerReadOptions.IFetchEventsByIds): Promise<INostrEvent[]>;
    fetchTempEvents(options: SocialEventManagerReadOptions.IFetchTempEvents): Promise<INostrEvent[]>;
    fetchAllUserRelatedChannels(options: SocialEventManagerReadOptions.IFetchAllUserRelatedChannels): Promise<IAllUserRelatedChannels>;
    fetchUserBookmarkedChannelEventIds(options: SocialEventManagerReadOptions.IFetchUserBookmarkedChannelEventIds): Promise<string[]>;
    fetchChannelMessages(options: SocialEventManagerReadOptions.IFetchChannelMessages): Promise<INostrEvent[]>;
    fetchChannelInfoMessages(options: SocialEventManagerReadOptions.IFetchChannelInfoMessages): Promise<INostrEvent[]>;
    fetchMessageContactsCacheEvents(options: SocialEventManagerReadOptions.IFetchMessageContactsCacheEvents): Promise<INostrEvent[]>;
    fetchDirectMessages(options: SocialEventManagerReadOptions.IFetchDirectMessages): Promise<INostrEvent[]>;
    resetMessageCount(options: SocialEventManagerReadOptions.IResetMessageCount): Promise<void>;
    fetchGroupKeys(options: SocialEventManagerReadOptions.IFetchGroupKeys): Promise<INostrEvent[]>;
    fetchUserGroupInvitations(options: SocialEventManagerReadOptions.IFetchUserGroupInvitations): Promise<INostrEvent[]>;
    fetchCalendarEventPosts(options: SocialEventManagerReadOptions.IFetchCalendarEventPosts): Promise<INostrEvent[]>;
    fetchCalendarEvents(options: SocialEventManagerReadOptions.IFetchCalendarEvents): Promise<ISocialEventManagerReadResult>;
    fetchCalendarEvent(options: SocialEventManagerReadOptions.IFetchCalendarEvent): Promise<INostrEvent | null>;
    fetchCalendarEventRSVPs(options: SocialEventManagerReadOptions.IFetchCalendarEventRSVPs): Promise<INostrEvent[]>;
    fetchLongFormContentEvents(options: SocialEventManagerReadOptions.IFetchLongFormContentEvents): Promise<INostrEvent[]>;
    searchUsers(options: SocialEventManagerReadOptions.ISearchUsers): Promise<INostrEvent[]>;
    fetchPaymentRequestEvent(options: SocialEventManagerReadOptions.IFetchPaymentRequestEvent): Promise<INostrEvent>;
    fetchPaymentReceiptEvent(options: SocialEventManagerReadOptions.IFetchPaymentReceiptEvent): Promise<INostrEvent>;
    fetchPaymentActivitiesForRecipient(options: SocialEventManagerReadOptions.IFetchPaymentActivitiesForRecipient): Promise<IPaymentActivity[]>;
    fetchPaymentActivitiesForSender(options: SocialEventManagerReadOptions.IFetchPaymentActivitiesForSender): Promise<IPaymentActivity[]>;
    fetchUserFollowingFeed(options: SocialEventManagerReadOptions.IFetchUserFollowingFeed): Promise<INostrEvent[]>;
    fetchCommunityPinnedNotesEvents(options: SocialEventManagerReadOptions.IFetchCommunityPinnedNotesEvents): Promise<INostrEvent[]>;
    fetchCommunityPinnedNoteIds(options: SocialEventManagerReadOptions.IFetchCommunityPinnedNoteIds): Promise<string[]>;
    fetchUserPinnedNotes(options: SocialEventManagerReadOptions.IFetchUserPinnedNotes): Promise<INostrEvent>;
    fetchUserBookmarks(options: SocialEventManagerReadOptions.IFetchUserBookmarks): Promise<INostrEvent>;
    fetchTrendingCommunities(): Promise<INostrEvent[]>;
    fetchUserEthWalletAccountsInfo(options: SocialEventManagerReadOptions.IFetchUserEthWalletAccountsInfo): Promise<INostrEvent>;
    fetchSubcommunites(options: SocialEventManagerReadOptions.IFetchSubcommunites): Promise<INostrEvent[]>;
    getCommunityUriToMembersMap(communities: ICommunityInfo[]): Promise<Record<string, ICommunityMember[]>>;
    fetchCommunityStalls(options: SocialEventManagerReadOptions.IFetchCommunityStalls): Promise<INostrEvent[]>;
    fetchCommunityProducts(options: SocialEventManagerReadOptions.IFetchCommunityProducts): Promise<INostrEvent[]>;
    fetchCommunityOrders(options: SocialEventManagerReadOptions.IFetchCommunityOrders): Promise<INostrEvent[]>;
    fetchBuyerOrders(options: SocialEventManagerReadOptions.IFetchBuyerOrders): Promise<INostrEvent[]>;
    fetchMarketplaceOrderDetails(options: SocialEventManagerReadOptions.IFetchMarketplaceOrderDetails): Promise<INostrEvent[]>;
    fetchMarketplaceProductDetails(options: SocialEventManagerReadOptions.IFetchMarketplaceProductDetails): Promise<INostrEvent[]>;
    fetchPaymentActivities(options: SocialEventManagerReadOptions.IFetchPaymentActivities): Promise<INostrEvent[]>;
    fetchMarketplaceProductKey(options: SocialEventManagerReadOptions.IFetchMarketplaceProductKey): Promise<string>;
    fetchProductPurchaseStatus(options: SocialEventManagerReadOptions.IFetchProductPurchaseStatus): Promise<boolean>;
    fetchReservationsByRole(options: SocialEventManagerReadOptions.IFetchReservationsByRole): Promise<IReservation[]>;
    fetchCommunityLeaderboard(options: SocialEventManagerReadOptions.IFetchCommunityLeaderboard): Promise<INostrFetchEventsResponse>;
    fetchUserCommunityScores(options: SocialEventManagerReadOptions.IFetchUserCommunityScores): Promise<IUserCommunityScore[]>;
    fetchUserCommunityScoreLogs(options: SocialEventManagerReadOptions.IFetchUserCommunityScoreLogs): Promise<IUserCommunityScoreLog[]>;
    fetchTokenActivities(options: SocialEventManagerReadOptions.IFetchStakeRequestEvent): Promise<ITokenActivity[]>;
    fetchUserAgents(options: SocialEventManagerReadOptions.IFetchUserAgents): Promise<INostrEvent[]>;
}
