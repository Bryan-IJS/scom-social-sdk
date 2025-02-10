import { Nip19, Event, Keys } from "../../core/index";
import { BuyerOrderStatus, CalendarEventType, CommunityRole, ICalendarEventAttendee, ICalendarEventDetailInfo, ICalendarEventHost, ICalendarEventInfo, IChannelInfo, IChannelScpData, ICheckIfUserHasAccessToCommunityOptions, ICheckRelayStatusResult, ICommunity, ICommunityBasicInfo, ICommunityDetailMetadata, ICommunityInfo, ICommunityLeaderboard, ICommunityMember, ICommunityPostScpData, ICommunityProductInfo, ICommunityStallInfo, ICommunityStats, ICommunitySubscription, IConversationPath, ICurrency, IDecryptPostPrivateKeyForCommunityOptions, IEthWalletAccountsInfo, IFetchPaymentActivitiesOptions, ILocationCoordinates, ILongFormContentInfo, IMarketplaceOrder, IMarketplaceOrderUpdateInfo, IMarketplaceProduct, IMarketplaceStall, IMessageContactInfo, INewCalendarEventPostInfo, INewChannelMessageInfo, INewCommunityInfo, INewCommunityPostInfo, INftSubscription, INostrEvent, INostrMetadata, INostrMetadataContent, INoteActions, INoteCommunity, INoteCommunityInfo, INoteInfo, INoteInfoExtended, IPaymentActivityV2, IPostStats, IRegion, IRelayConfig, IRetrieveChannelMessageKeysOptions, IRetrieveCommunityPostKeysByNoteEventsOptions, IRetrieveCommunityPostKeysOptions, IRetrieveCommunityThreadPostKeysOptions, IRetrievedBuyerOrder, IRetrievedMarketplaceOrder, ISendTempMessageOptions, ISocialDataManagerConfig, ISocialEventManagerRead, ISocialEventManagerWrite, ITrendingCommunityInfo, IUpdateCalendarEventInfo, IUpdateCommunitySubscription, IUserActivityStats, IUserProfile, MembershipType, ProtectedMembershipPolicyType, ScpStandardId, SellerOrderStatus, SocialDataManagerOptions } from "../../interfaces";
import {
    INostrCommunicationManager,
    INostrRestAPIManager,
    NostrRestAPIManager,
    NostrWebSocketManager,
} from "../communication";
import Geohash from '../../utils/geohash';
import { MqttManager } from "@scom/scom-mqtt";
import { LightningWalletManager } from "../../utils/lightningWallet";
import { SocialUtilsManager } from "../utilsManager";
import {  NostrEventManagerWrite } from "../eventManagerWrite";
import { NostrEventManagerRead } from "../eventManagerRead";
import { NostrEventManagerReadV2 } from "../eventManagerReadV2";
import { NostrEventManagerReadV1o5 } from "../eventManagerReadV1o5";
import { Crypto } from "@scom/scom-signer";
import { Contracts, TransactionReceipt, Utils, Wallet } from "@ijstech/eth-wallet";
import { SystemDataManager } from "./system";

class SocialDataManager {
    private _writeRelays: string[];
    private _publicIndexingRelay: string;
    private _apiBaseUrl: string;
    private _ipLocationServiceBaseUrl: string;
    private _socialEventManagerRead: ISocialEventManagerRead;
    private _socialEventManagerWrite: ISocialEventManagerWrite;
    private _privateKey: string;
    private _selfPubkey: string;
    private mqttManager: MqttManager;
    private lightningWalletManager: LightningWalletManager;
    private systemDataManager: SystemDataManager;

    constructor(config: ISocialDataManagerConfig) {
        this._apiBaseUrl = config.apiBaseUrl || '';
        this._ipLocationServiceBaseUrl = config.ipLocationServiceBaseUrl;
        this._publicIndexingRelay = config.publicIndexingRelay;
        const writeRelaysManagers = this._initializeWriteRelaysManagers(config.writeRelays);
        if (config.readManager) {
            this._socialEventManagerRead = config.readManager;
        }
        else {
            let nostrReadRelayManager = new NostrRestAPIManager(config.readRelay);
            if (config.version === 2) {
                this._socialEventManagerRead = new NostrEventManagerReadV2(
                    nostrReadRelayManager as NostrRestAPIManager
                );
            }
            else if (config.version === 1.5) {
                this._socialEventManagerRead = new NostrEventManagerReadV1o5(
                    nostrReadRelayManager as NostrRestAPIManager
                );
            }
            else {
                this._socialEventManagerRead = new NostrEventManagerRead(
                    nostrReadRelayManager
                );
            }
        }
        this._socialEventManagerWrite = new NostrEventManagerWrite(
            writeRelaysManagers,
            this._publicIndexingRelay
        );
        if (config.mqttBrokerUrl) {
            try {
                this.mqttManager = new MqttManager({
                    brokerUrl: config.mqttBrokerUrl,
                    mqttClientOptions: config.mqttClientOptions,
                    subscriptions: config.mqttSubscriptions,
                    messageCallback: config.mqttMessageCallback
                });
            }
            catch (e) {
                console.error('Failed to connect to MQTT broker', e);
            }
        }
        if (config.enableLightningWallet) {
            this.lightningWalletManager = new LightningWalletManager();
        }
        this.systemDataManager = new SystemDataManager(this._publicIndexingRelay);
    }

    public async dispose() {
        if (this.mqttManager) {
            await this.mqttManager.disconnect();
            this.mqttManager = null;
        }
    }

    set privateKey(privateKey: string) {
        this._privateKey = privateKey;
        this.systemDataManager.privateKey = privateKey;
        this._selfPubkey = SocialUtilsManager.convertPrivateKeyToPubkey(privateKey);
        this._socialEventManagerRead.privateKey = privateKey;
        this._socialEventManagerWrite.privateKey = privateKey;
        if (this.lightningWalletManager) {
            this.lightningWalletManager.privateKey = privateKey;
        }
    }

    get socialEventManagerRead() {
        return this._socialEventManagerRead;
    }

    get socialEventManagerWrite() {
        return this._socialEventManagerWrite;
    }

    set relays(value: string[]) {
        const writeRelaysManagers = this._initializeWriteRelaysManagers(value);
        this._socialEventManagerWrite.nostrCommunicationManagers = writeRelaysManagers;
    }

    get privateKey() {
        return this._privateKey;
    }

    get selfPubkey() {
        return this._selfPubkey;
    }

    private _initializeWriteRelaysManagers(relays: string[]) {
        if (!relays || relays.length === 0) {
            this._writeRelays = [];
            return [];
        }
        this._writeRelays = [this._publicIndexingRelay, ...relays];
        this._writeRelays = Array.from(new Set(this._writeRelays));
        let nostrCommunicationManagers: INostrCommunicationManager[] = [];
        for (let relay of this._writeRelays) {
            if (relay.startsWith('wss://')) {
                nostrCommunicationManagers.push(new NostrWebSocketManager(relay));
            }
            else {
                nostrCommunicationManagers.push(new NostrRestAPIManager(relay));
            }
        }
        return nostrCommunicationManagers;
    }

    subscribeToMqttTopics(topics: string[]) {
        this.mqttManager.subscribe(topics);
    }

    unsubscribeFromMqttTopics(topics: string[]) {
        this.mqttManager.unsubscribe(topics);
    }

    publishToMqttTopic(topic: string, message: string) {
        this.mqttManager.publish(topic, message);
    }

    async fetchCommunityFeedInfo(creatorId: string, communityId: string, since?: number, until?: number) {
        const communityUri = SocialUtilsManager.getCommunityUri(creatorId, communityId);
        const events = await this._socialEventManagerRead.fetchCommunityFeed({
            communityUri,
            since,
            until
        });
        const {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap
        } = this.createNoteEventMappings(events);
        return {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap
        }
    }

    retrieveCommunityUri(noteEvent: INostrEvent, scpData: ICommunityPostScpData) {
        let communityUri: string | null = null;
        if (scpData?.communityUri) {
            communityUri = scpData.communityUri;
        }
        else {
            const replaceableTag = noteEvent.tags.find(tag => tag[0] === 'a');
            if (replaceableTag) {
                const replaceableTagArr = replaceableTag[1].split(':');
                if (replaceableTagArr[0] === '34550') {
                    communityUri = replaceableTag[1];
                }
            }
        }
        return communityUri;
    }

    //To be deprecated
    async retrievePostPrivateKey(event: INostrEvent, communityUri: string, communityPrivateKey: string) {
        let key: string | null = null;
        let postScpData = SocialUtilsManager.extractScpData(event, ScpStandardId.CommunityPost);
        if (!postScpData) return key;
        try {
            const postPrivateKey = await SocialUtilsManager.decryptMessage(communityPrivateKey, event.pubkey, postScpData.encryptedKey);
            const messageContentStr = await SocialUtilsManager.decryptMessage(postPrivateKey, event.pubkey, event.content);
            const messageContent = JSON.parse(messageContentStr);
            if (communityUri === messageContent.communityUri) {
                key = postPrivateKey;
            }
        }
        catch (e) {
            // console.error(e);
        }
        return key;
    }

    async decryptPostPrivateKeyForCommunity(options: IDecryptPostPrivateKeyForCommunityOptions) {
        const { event, selfPubkey, communityUri, communityPublicKey, communityPrivateKey } = options;
        let key: string | null = null;
        let postScpData = SocialUtilsManager.extractScpData(event, ScpStandardId.CommunityPost);
        if (!postScpData) return key;
        try {
            if (selfPubkey && communityPublicKey && event.pubkey === selfPubkey) {
                key = await SocialUtilsManager.decryptMessage(this._privateKey, communityPublicKey, postScpData.encryptedKey);
            }
            else if (communityPrivateKey) {
                const postPrivateKey = await SocialUtilsManager.decryptMessage(communityPrivateKey, event.pubkey, postScpData.encryptedKey);
                const messageContentStr = await SocialUtilsManager.decryptMessage(postPrivateKey, event.pubkey, event.content);
                const messageContent = JSON.parse(messageContentStr);
                if (communityUri === messageContent.communityUri) {
                    key = postPrivateKey;
                }
            }
        }
        catch (e) {
            // console.error(e);
        }
        return key;
    }

    async retrieveChannelMessagePrivateKey(event: INostrEvent, channelId: string, communityPrivateKey: string) {
        let key: string | null = null;
        let messageScpData = SocialUtilsManager.extractScpData(event, ScpStandardId.ChannelMessage);
        try {
            const messagePrivateKey = await SocialUtilsManager.decryptMessage(communityPrivateKey, event.pubkey, messageScpData.encryptedKey);
            const messageContentStr = await SocialUtilsManager.decryptMessage(messagePrivateKey, event.pubkey, event.content);
            const messageContent = JSON.parse(messageContentStr);
            if (channelId === messageContent.channelId) {
                key = messagePrivateKey;
            }
        }
        catch (e) {
            // console.error(e);
        }
        return key;
    }

    async retrieveCommunityPrivateKey(communityInfo: ICommunityInfo, selfPrivateKey: string) {
        if (!communityInfo.scpData?.gatekeeperPublicKey) return null;
        const encryptedKey = communityInfo.scpData.encryptedKey || communityInfo.memberKeyMap?.[communityInfo.scpData.gatekeeperPublicKey];
        if (!encryptedKey) return null;
        let communityPrivateKey: string;
        const creatorPubkey = communityInfo.eventData.pubkey;
        if (this.selfPubkey === communityInfo.scpData.gatekeeperPublicKey) {
            communityPrivateKey = await SocialUtilsManager.decryptMessage(selfPrivateKey, creatorPubkey, encryptedKey);
        }
        else if (this.selfPubkey === creatorPubkey) {
            communityPrivateKey = await SocialUtilsManager.decryptMessage(selfPrivateKey, communityInfo.scpData.gatekeeperPublicKey, encryptedKey);
        }
        return communityPrivateKey;
    }

    private async constructCommunityNoteIdToPrivateKeyMap(communityInfo: ICommunityInfo, noteInfoList: INoteInfo[]) {
        let noteIdToPrivateKey: Record<string, string> = {};
        let communityPrivateKey = await this.retrieveCommunityPrivateKey(communityInfo, this._privateKey);
        for (const note of noteInfoList) {
            let postPrivateKey = await this.decryptPostPrivateKeyForCommunity({
                event: note.eventData, 
                selfPubkey: this.selfPubkey, 
                communityUri: communityInfo.communityUri, 
                communityPublicKey: communityInfo.scpData.publicKey, 
                communityPrivateKey
            });
            if (postPrivateKey) {
                noteIdToPrivateKey[note.eventData.id] = postPrivateKey;
            }
        }
        return noteIdToPrivateKey;
    }

    async retrieveCommunityPostKeys(options: IRetrieveCommunityPostKeysOptions) {
        const {communityInfo, noteInfoList} = options;
        let noteIdToPrivateKey: Record<string, string> = {};
        if (options.gatekeeperUrl) {
            const authHeader = SocialUtilsManager.constructAuthHeader(this._privateKey);
            let bodyData = {
                creatorId: communityInfo.creatorId,
                communityId: communityInfo.communityId,
                message: options.message,
                signature: options.signature,
                since: options.since,
                until: options.until
            };
            let url = `${options.gatekeeperUrl}/communities/post-keys`;
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify(bodyData)
            });
            let result = await response.json();
            if (result.success) {
                noteIdToPrivateKey = result.data;
            }
        }
        else {
            noteIdToPrivateKey = await this.constructCommunityNoteIdToPrivateKeyMap(
                communityInfo, 
                noteInfoList
            );
        }
        return noteIdToPrivateKey;
    }

    async retrieveCommunityThreadPostKeys(options: IRetrieveCommunityThreadPostKeysOptions) {
        const {communityInfo, noteInfoList} = options;
        let noteIdToPrivateKey: Record<string, string> = {};
        if (options.gatekeeperUrl) {
            const authHeader = SocialUtilsManager.constructAuthHeader(this._privateKey);
            let bodyData = {
                creatorId: communityInfo.creatorId,
                communityId: communityInfo.communityId,
                focusedNoteId: options.focusedNoteId,
                message: options.message,
                signature: options.signature
            };
            let url = `${options.gatekeeperUrl}/communities/post-keys`;
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify(bodyData)
            });
            let result = await response.json();
            if (result.success) {
                noteIdToPrivateKey = result.data;
            }
        }
        else {
            noteIdToPrivateKey = await this.constructCommunityNoteIdToPrivateKeyMap(
                communityInfo, 
                noteInfoList
            );
        }
        return noteIdToPrivateKey;
    }

    async retrieveCommunityPostKeysByNoteEvents(options: IRetrieveCommunityPostKeysByNoteEventsOptions) {
        let noteIdToPrivateKey: Record<string, string> = {};
        let communityPrivateKeyMap: Record<string, string> = {};
        const noteCommunityMappings = await this.createNoteCommunityMappings(options.notes);
        if (noteCommunityMappings.noteCommunityInfoList.length === 0) return noteIdToPrivateKey;
        const communityInfoMap: Record<string, ICommunityInfo> = {};
        for (let communityInfo of noteCommunityMappings.communityInfoList) {
            communityInfoMap[communityInfo.communityUri] = communityInfo;
            if (communityInfo.membershipType === MembershipType.Open) continue;
            let communityPrivateKey = await this.retrieveCommunityPrivateKey(communityInfo, this._privateKey);
            if (communityPrivateKey) {
                communityPrivateKeyMap[communityInfo.communityUri] = communityPrivateKey;
            }
        }
        let relayToNotesMap: Record<string, INoteCommunityInfo[]> = {};
        for (let noteCommunityInfo of noteCommunityMappings.noteCommunityInfoList) {
            const communityPrivateKey = communityPrivateKeyMap[noteCommunityInfo.communityUri];
            const communityInfo = communityInfoMap[noteCommunityInfo.communityUri];
            if (!communityInfo) continue;
            if (communityInfo.membershipType === MembershipType.Open) continue;
            let postPrivateKey = await this.decryptPostPrivateKeyForCommunity({
                event: noteCommunityInfo.eventData, 
                selfPubkey: options.pubKey, 
                communityUri: noteCommunityInfo.communityUri, 
                communityPublicKey: communityInfo.scpData.publicKey, 
                communityPrivateKey
            });
            if (postPrivateKey) {
                noteIdToPrivateKey[noteCommunityInfo.eventData.id] = postPrivateKey;
            }
            else {
                if (communityInfo.privateRelay) {
                    relayToNotesMap[communityInfo.privateRelay] = relayToNotesMap[communityInfo.privateRelay] || [];
                    relayToNotesMap[communityInfo.privateRelay].push(noteCommunityInfo);
                }
                else if (options.gatekeeperUrl) {
                    relayToNotesMap[options.gatekeeperUrl] = relayToNotesMap[options.gatekeeperUrl] || [];
                    relayToNotesMap[options.gatekeeperUrl].push(noteCommunityInfo);
                }
            }
        }
        if (Object.keys(relayToNotesMap).length > 0) {
            for (let relay in relayToNotesMap) {
                const noteIds = relayToNotesMap[relay].map(v => v.eventData.id);
                const signature = await options.getSignature(options.message);
                const authHeader = SocialUtilsManager.constructAuthHeader(this._privateKey);
                let bodyData = {
                    noteIds: noteIds.join(','),
                    message: options.message,
                    signature: signature
                };
                let url = `${relay}/communities/post-keys`;
                let response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    },
                    body: JSON.stringify(bodyData)
                });
                let result = await response.json();
                if (result.success) {
                    noteIdToPrivateKey = {
                        ...noteIdToPrivateKey,
                        ...result.data
                    };
                }
            }
        }
        return noteIdToPrivateKey;
    }

    async checkIfUserHasAccessToCommunity(options: ICheckIfUserHasAccessToCommunityOptions) {
        const { communityInfo, gatekeeperUrl, walletAddresses } = options;
        let data: {
            hasAccess: boolean,
            subscriptions: ICommunitySubscription[],
            isWhiteListed: boolean
        } = { hasAccess: false, subscriptions: [], isWhiteListed: false };
        const pubkey = Keys.getPublicKey(this._privateKey);
        let bodyData = {
            creatorId: communityInfo.creatorId,
            communityId: communityInfo.communityId,
            pubkey,
            walletAddresses
        };
        let url = `${gatekeeperUrl}/communities/check-user-access`;
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyData)
        });
        let result = await response.json();
        if (result.success) {
            data = result.data;
        }
        return data;
    }

    async constructMetadataByPubKeyMap(notes: INostrEvent[]) {
        let mentionAuthorSet = new Set();
        for (let i = 0; i < notes.length; i++) {
            const mentionTags = notes[i].tags.filter(tag => tag[0] === 'p' && tag[1] !== notes[i].pubkey)?.map(tag => tag[1]) || [];
            if (mentionTags.length) {
                mentionTags.forEach(tag => mentionAuthorSet.add(tag));
            }
        }
        const uniqueKeys = Array.from(mentionAuthorSet) as string[];
        const npubs = notes.map(note => note.pubkey).filter((value, index, self) => self.indexOf(value) === index);
        const metadata = await this._socialEventManagerRead.fetchUserProfileCacheEvents({
            pubKeys: [...npubs, ...uniqueKeys]
        });

        const metadataByPubKeyMap: Record<string, INostrMetadata> = metadata.reduce((acc, cur) => {
            const content = JSON.parse(cur.content);
            if (cur.pubkey) {
                acc[cur.pubkey] = {
                    ...cur,
                    content
                };
            }
            return acc;
        }, {});
        return metadataByPubKeyMap;
    }

    async fetchUserProfiles(pubKeys: string[]): Promise<IUserProfile[]> {
        if (pubKeys.length === 0) return [];
        let metadataArr: INostrMetadata[] = [];
        let followersCountMap: Record<string, number> = {};
        try {
            const events = await this._socialEventManagerRead.fetchUserProfileCacheEvents({ pubKeys });
            for (let event of events) {
                if (event.kind === 0) {
                    metadataArr.push({
                        ...event,
                        content: SocialUtilsManager.parseContent(event.content)
                    });
                }
                else if (event.kind === 10000108) {
                    followersCountMap = SocialUtilsManager.parseContent(event.content);
                }
            }
        }
        catch (error) {
            console.error('fetchUserProfiles', error);
        }
        if (metadataArr.length == 0) return null;
        const userProfiles: IUserProfile[] = [];
        for (let metadata of metadataArr) {
            let userProfile = SocialUtilsManager.constructUserProfile(metadata, followersCountMap);
            userProfiles.push(userProfile);
        }
        return userProfiles;
    }

    //To be deprecated
    async updateUserProfile(content: INostrMetadataContent) {
        await this._socialEventManagerWrite.updateUserProfile(content)
    }

    async updateUserProfileV2(profile: Partial<IUserProfile>) {
        const content: INostrMetadataContent = {
            ...profile.metadata?.content,
            name: profile.username,
            display_name: profile.displayName,
            website: profile.website,
            picture: profile.avatar,
            about: profile.description,
            banner: profile.banner,
            eth_wallet: profile.ethWallet,
            telegram_account: profile.telegramAccount,
        }
        await this._socialEventManagerWrite.updateUserProfile(content)
    }

    async fetchTrendingNotesInfo() {
        let notes: INoteInfo[] = [];
        let metadataByPubKeyMap: Record<string, INostrMetadata> = {};
        const events = await this._socialEventManagerRead.fetchTrendingCacheEvents({});
        for (let event of events) {
            if (event.kind === 0) {
                metadataByPubKeyMap[event.pubkey] = {
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                };
            }
            else if (event.kind === 1) {
                notes.push({
                    eventData: event
                });
            }
        }
        return {
            notes,
            metadataByPubKeyMap
        };
    }

    private constructNoteCommunity(noteEvent: INostrEvent, communityInfoMap: Record<string, ICommunityInfo>) {
        let community: INoteCommunity;
        if (noteEvent.tags?.length) {
            let scpData = SocialUtilsManager.extractScpData(noteEvent, ScpStandardId.CommunityPost);
            let communityUri = this.retrieveCommunityUri(noteEvent, scpData);
            if (communityUri) {
                const communityInfo = communityInfoMap[communityUri];
                const { creatorId, communityId } = SocialUtilsManager.getCommunityBasicInfoFromUri(communityUri);
                community = {
                    communityUri,
                    communityId: communityInfo?.communityId || communityId,
                    creatorId: communityInfo?.creatorId || Nip19.npubEncode(creatorId),
                    photoUrl: communityInfo?.avatarImgUrl || communityInfo?.bannerImgUrl,
                    parentCommunityUri: communityInfo?.parentCommunityUri,
                    privateRelay: communityInfo?.privateRelay,
                    isExclusive: communityInfo?.membershipType === MembershipType.Protected,
                    isWhitelist: communityInfo?.policies?.[0]?.policyType === ProtectedMembershipPolicyType.Whitelist,
                    policies: communityInfo?.policies
                };
            }
        }
        return community;
    }

    async fetchProfileFeedInfo(pubKey: string, since: number = 0, until?: number) {
        const events = await this._socialEventManagerRead.fetchProfileFeedCacheEvents({
            userPubkey: this.selfPubkey,
            pubKey,
            since,
            until
        });
        const earliest = this.getEarliestEventTimestamp(events.filter(v => v.created_at));
        const {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            noteToRepostIdMap,
            pubkeyToCommunityIdsMap
        } = this.createNoteEventMappings(events);
        const communityInfoMap: Record<string, ICommunityInfo> = {};
        if (Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            const communityEvents = await this._socialEventManagerRead.fetchCommunities({
                pubkeyToCommunityIdsMap
            });
            for (let event of communityEvents) {
                let communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                communityInfoMap[communityInfo.communityUri] = communityInfo;
            }
        }
        for (let note of notes as INoteInfoExtended[]) {
            note.community = this.constructNoteCommunity(note.eventData, communityInfoMap);
            const noteId = note.eventData.id;
            const repostId = noteToRepostIdMap[noteId];
            if (!repostId) continue;
            const metadata = metadataByPubKeyMap[repostId];
            if (!metadata) continue;
            const metadataContent = metadata.content;
            const encodedPubkey = Nip19.npubEncode(metadata.pubkey);
            const internetIdentifier = typeof metadataContent.nip05 === 'string' ? metadataContent.nip05?.replace('_@', '') || '' : '';
            note.repost = {
                id: encodedPubkey,
                username: '',
                description: metadataContent.about,
                avatar: metadataContent.picture,
                pubKey: encodedPubkey,
                displayName: metadataContent.display_name || metadataContent.name,
                internetIdentifier: internetIdentifier
            };
        }
        return {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            earliest
        };
    }

    async fetchProfileRepliesInfo(pubKey: string, since: number = 0, until?: number) {
        const events = await this._socialEventManagerRead.fetchProfileRepliesCacheEvents({
            userPubkey: this.selfPubkey,
            pubKey,
            since,
            until
        });
        const earliest = this.getEarliestEventTimestamp(events.filter(v => v.created_at));
        const {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            noteToParentAuthorIdMap
        } = this.createNoteEventMappings(events, true);
        for (let note of notes as INoteInfoExtended[]) {
            const noteId = note.eventData.id;
            const parentAuthorId = noteToParentAuthorIdMap[noteId];
            if (!parentAuthorId) continue;
            const metadata = metadataByPubKeyMap[parentAuthorId];
            if (!metadata) continue;
            const metadataContent = metadata.content;
            const encodedPubkey = Nip19.npubEncode(metadata.pubkey);
            const internetIdentifier = typeof metadataContent.nip05 === 'string' ? metadataContent.nip05?.replace('_@', '') || '' : '';
            note.parentAuthor = {
                id: encodedPubkey,
                username: '',
                description: metadataContent.about,
                avatar: metadataContent.picture,
                pubKey: encodedPubkey,
                displayName: metadataContent.display_name || metadataContent.name,
                internetIdentifier: internetIdentifier
            };
        }

        return {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            earliest
        };
    }

    async fetchEventsByIds(ids: string[]) {
        const events = await this._socialEventManagerRead.fetchEventsByIds({ ids });
        return events;
    }

    async fetchNotesByIds(ids: string[]) {
        const noteEvents = await this._socialEventManagerRead.fetchEventsByIds({ ids });
        const {
            notes,
            quotedNotesMap,
            pubkeyToCommunityIdsMap
        } = this.createNoteEventMappings(noteEvents);
        let metadataByPubKeyMap = await this.constructMetadataByPubKeyMap(noteEvents);
        const communityInfoMap: Record<string, ICommunityInfo> = {};
        if (Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            const communityEvents = await this._socialEventManagerRead.fetchCommunities({
                pubkeyToCommunityIdsMap
            });
            for (let event of communityEvents) {
                let communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                communityInfoMap[communityInfo.communityUri] = communityInfo;
            }
        }
        for (let note of notes as INoteInfoExtended[]) {
            if (!note.actions) note.actions = {};
            note.actions.bookmarked = true;
            note.community = this.constructNoteCommunity(note.eventData, communityInfoMap);
        }
        return {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap
        }
    }

    async fetchTempEvents(ids: string[]) {
        const noteEvents = await this._socialEventManagerRead.fetchTempEvents({ ids });
        return noteEvents;
    }

    private getEarliestEventTimestamp(events: INostrEvent[]) {
        if (!events || events.length === 0) {
            return 0;
        }
        return events.reduce((createdAt, event) => {
            return Math.min(createdAt, event.created_at);
        }, events[0].created_at);
    }

    async fetchHomeFeedInfo(pubKey: string, since: number = 0, until?: number) {
        let events: INostrEvent[] = await this._socialEventManagerRead.fetchHomeFeedCacheEvents({
            pubKey,
            since,
            until
        });
        const earliest = this.getEarliestEventTimestamp(events.filter(v => v.kind === 1).filter(v => v.created_at));
        const {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            pubkeyToCommunityIdsMap
        } = this.createNoteEventMappings(events);
        const communityInfoMap: Record<string, ICommunityInfo> = {};
        if (Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            const communityEvents = await this._socialEventManagerRead.fetchCommunities({
                pubkeyToCommunityIdsMap
            });
            for (let event of communityEvents) {
                let communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                communityInfoMap[communityInfo.communityUri] = communityInfo;
            }
        }
        for (let note of notes as INoteInfoExtended[]) {
            note.community = this.constructNoteCommunity(note.eventData, communityInfoMap);
        }
        return {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            earliest
        }
    }
    async fetchUserFollowingFeedInfo(pubKey: string, until?: number) {
        let events: INostrEvent[] = await this._socialEventManagerRead.fetchUserFollowingFeed({
            pubKey,
            until
        });
        const earliest = this.getEarliestEventTimestamp(events.filter(v => (v.kind === 1 || v.kind === 6) && v.created_at));
        const {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            pubkeyToCommunityIdsMap
        } = this.createNoteEventMappings(events);
        const communityInfoMap: Record<string, ICommunityInfo> = {};
        if (Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            const communityEvents = await this._socialEventManagerRead.fetchCommunities({
                pubkeyToCommunityIdsMap
            });
            for (let event of communityEvents) {
                let communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                communityInfoMap[communityInfo.communityUri] = communityInfo;
            }
        }
        for (let note of notes as INoteInfoExtended[]) {
            note.community = this.constructNoteCommunity(note.eventData, communityInfoMap);
        }
        return {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            earliest
        }
    }
    createNoteEventMappings(events: INostrEvent[], parentAuthorsInfo: boolean = false) {
        let notes: INoteInfo[] = [];
        let metadataByPubKeyMap: Record<string, INostrMetadata> = {};
        let quotedNotesMap: Record<string, INoteInfo> = {};
        let noteToParentAuthorIdMap: Record<string, string> = {};
        let noteToRepostIdMap: Record<string, string> = {};
        let noteStatsMap: Record<string, IPostStats> = {};
        let noteActionsMap: Record<string, INoteActions> = {};
        let pubkeyToCommunityIdsMap: Record<string, string[]> = {};
        for (let event of events) {
            if (event.kind === 0) {
                metadataByPubKeyMap[event.pubkey] = {
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                };
            }
            else if (event.kind === 10000107) {
                if (!event.content) continue;
                const noteEvent = SocialUtilsManager.parseContent(event.content) as INostrEvent;
                quotedNotesMap[noteEvent.id] = {
                    eventData: noteEvent
                }
            }
            else if (event.kind === 1) {
                notes.push({
                    eventData: event
                });
                if (parentAuthorsInfo) {
                    const parentAuthors = event.tags.filter(tag => tag[0] === 'p')?.map(tag => tag[1]) || [];
                    if (parentAuthors.length > 0) {
                        noteToParentAuthorIdMap[event.id] = parentAuthors[parentAuthors.length - 1];
                    }
                }
            }
            else if (event.kind === 6) {
                if (!event.content) continue;
                const originalNoteContent = SocialUtilsManager.parseContent(event.content);
                notes.push({
                    eventData: originalNoteContent
                });
                if (originalNoteContent?.id)
                    noteToRepostIdMap[originalNoteContent.id] = event.pubkey;
                if (parentAuthorsInfo) {
                    const parentAuthors = event.tags.filter(tag => tag[0] === 'p')?.map(tag => tag[1]) || [];
                    if (parentAuthors.length > 0) {
                        noteToParentAuthorIdMap[event.id] = parentAuthors[parentAuthors.length - 1];
                    }
                }
            }
            else if (event.kind === 10000100) {
                if (!event.content) continue;
                const content = SocialUtilsManager.parseContent(event.content);
                noteStatsMap[content.event_id] = {
                    upvotes: content.likes,
                    replies: content.replies,
                    reposts: content.reposts,
                    satszapped: content.satszapped,
                    status: content.status
                }
            }
            else if (event.kind === 10000113) {
                //"{\"since\":1700034697,\"until\":1700044097,\"order_by\":\"created_at\"}"
                const timeInfo = SocialUtilsManager.parseContent(event.content);
            }
            else if (event.kind === 10000115) {
                if (!event.content) continue;
                const content = SocialUtilsManager.parseContent(event.content);
                noteActionsMap[content.event_id] = {
                    liked: content.liked,
                    replied: content.replied,
                    reposted: content.reposted,
                    zapped: content.zapped
                }
            }
        }
        for (let note of notes) {
            const noteId = note.eventData?.id;
            note.stats = noteStatsMap[noteId];
            note.actions = noteActionsMap[noteId];
            const communityUri = note.eventData?.tags?.find(tag => tag[0] === 'a')?.[1];
            if (communityUri) {
                const { creatorId, communityId } = SocialUtilsManager.getCommunityBasicInfoFromUri(communityUri);
                if (!pubkeyToCommunityIdsMap[creatorId]) {
                    pubkeyToCommunityIdsMap[creatorId] = [];
                }
                if (!pubkeyToCommunityIdsMap[creatorId].includes(communityId)) {
                    pubkeyToCommunityIdsMap[creatorId].push(communityId);
                }
            }
        }
        return {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            noteToParentAuthorIdMap,
            noteStatsMap,
            noteToRepostIdMap,
            noteActionsMap,
            pubkeyToCommunityIdsMap
        }
    }

    async fetchCommunityInfo(creatorId: string, communityId: string) {
        const communityEvents = await this._socialEventManagerRead.fetchCommunity({
            creatorId,
            communityId
        });
        const communityEvent = communityEvents.find(event => event.kind === 34550);
        if (!communityEvent) return null;
        let communityInfo = SocialUtilsManager.extractCommunityInfo(communityEvent);
        //Fetch group keys only when scpData.encryptedKey is undefined for backward compatibility
        if (communityInfo.membershipType === MembershipType.Protected && !communityInfo.scpData?.encryptedKey) {
            const keyEvents = await this._socialEventManagerRead.fetchGroupKeys({
                identifiers: [communityInfo.communityUri + ':keys']
            });
            const keyEvent = keyEvents[0];
            if (keyEvent) {
                communityInfo.memberKeyMap = JSON.parse(keyEvent.content);
            }
        }
        return communityInfo;
    }

    async fetchCommunityLeaderboard(community: ICommunityInfo) {
        const result = await this._socialEventManagerRead.fetchCommunityLeaderboard({
            communityId: community.communityId,
            creatorId: community.creatorId
        });
        let metadataByPubKeyMap: Record<string, INostrMetadata> = {};
        for (let event of result.events) {
            if (event.kind === 0) {
                metadataByPubKeyMap[event.pubkey] = {
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                };
            }
        }
        const data: ICommunityLeaderboard[] = result.data?.map(leaderboard => {
            const metadata = metadataByPubKeyMap[leaderboard.pubkey];
            const metadataContent = metadata.content;
            const internetIdentifier = typeof metadataContent.nip05 === 'string' ? metadataContent.nip05?.replace('_@', '') || '' : '';
            return {
                npub: Nip19.npubEncode(metadata.pubkey),
                username: metadataContent.name,
                displayName: metadataContent.display_name,
                avatar: metadataContent.picture,
                internetIdentifier,
                point: leaderboard.score
            }
        }) || [];
        return data;
    }

    async fetchUserRelatedCommunityFeedInfo(pubKey: string, since?: number, until?: number) {
        let result: INoteInfoExtended[] = [];
        const events = await this._socialEventManagerRead.fetchAllUserRelatedCommunitiesFeed({ pubKey, since, until });
        const statsEvents = events.filter(event => event.kind === 10000100);

        // const {
        //     notes,
        //     metadataByPubKeyMap,
        //     quotedNotesMap
        // } = this.createNoteEventMappings(feedEvents);
        let noteStatsMap: Record<string, IPostStats> = {};
        for (let event of statsEvents) {
            const content = SocialUtilsManager.parseContent(event.content);
            noteStatsMap[content.event_id] = {
                upvotes: content.likes,
                replies: content.replies,
                reposts: content.reposts,
                satszapped: content.satszapped
            }
        }
        const notesEvents = events.filter(event => event.kind === 1);
        for (let noteEvent of notesEvents) {
            if (noteEvent.tags?.length) {
                const communityUri = noteEvent.tags.find(tag => tag[0] === 'a')?.[1];
                if (communityUri) {
                    const { creatorId, communityId } = SocialUtilsManager.getCommunityBasicInfoFromUri(communityUri);
                    const stats = noteStatsMap[noteEvent.id];
                    const noteInfo: INoteInfoExtended = {
                        eventData: noteEvent,
                        stats,
                        community: {
                            communityUri,
                            communityId,
                            creatorId: Nip19.npubEncode(creatorId)
                        }
                    };
                    result.push(noteInfo);
                }
            }
        }
        return result;
    }

    async fetchThreadNotesInfo(focusedNoteId: string) {
        let focusedNote: INoteInfo;
        let ancestorNotes: INoteInfo[] = [];
        let replies: INoteInfo[] = [];
        let childReplyEventTagIds: string[] = [];
        //Ancestor posts -> Focused post -> Child replies
        let decodedFocusedNoteId = focusedNoteId.startsWith('note1') ? Nip19.decode(focusedNoteId).data as string : focusedNoteId;
        const threadEvents = await this._socialEventManagerRead.fetchThreadCacheEvents({
            id: decodedFocusedNoteId,
            pubKey: this.selfPubkey
        });
        const {
            notes,
            metadataByPubKeyMap,
            quotedNotesMap,
            pubkeyToCommunityIdsMap
        } = this.createNoteEventMappings(threadEvents);
        const communityInfoMap: Record<string, ICommunityInfo> = {};
        if (Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            const communityEvents = await this._socialEventManagerRead.fetchCommunities({
                pubkeyToCommunityIdsMap
            });
            for (let event of communityEvents) {
                let communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                communityInfoMap[communityInfo.communityUri] = communityInfo;
            }
        }
        const quotedPubKeys = [];
        for (let eventId in quotedNotesMap) {
            const pubKey = quotedNotesMap[eventId].eventData.pubkey;
            if (!metadataByPubKeyMap[pubKey]) quotedPubKeys.push(pubKey);
        }
        if (quotedPubKeys.length > 0) {
            const metadata = await this._socialEventManagerRead.fetchUserProfileCacheEvents({
                pubKeys: quotedPubKeys
            });
    
            const _metadataByPubKeyMap: Record<string, INostrMetadata> = metadata.reduce((acc, cur) => {
                const content = JSON.parse(cur.content);
                if (cur.pubkey) {
                    acc[cur.pubkey] = {
                        ...cur,
                        content
                    };
                }
                return acc;
            }, {});

            Object.assign(metadataByPubKeyMap, _metadataByPubKeyMap);
        }
        for (let note of notes as INoteInfoExtended[]) {
            note.community = this.constructNoteCommunity(note.eventData, communityInfoMap);
            if (note.eventData.id === decodedFocusedNoteId) {
                focusedNote = note;
            }
            else if (note.eventData.tags.some(tag => tag[0] === 'e' && tag[1] === decodedFocusedNoteId)) {
                replies.push(note);
            }
            else {
                ancestorNotes.push(note);
            }
        }
        replies = replies.sort((a, b) => b.eventData.created_at - a.eventData.created_at);
        ancestorNotes = ancestorNotes.sort((a, b) => a.eventData.created_at - b.eventData.created_at);
        let communityInfo: ICommunityInfo | null = null;
        let scpData = SocialUtilsManager.extractScpData(focusedNote.eventData, ScpStandardId.CommunityPost);
        if (scpData) {
            const communityUri = this.retrieveCommunityUri(focusedNote.eventData, scpData);
            if (communityUri) {
                const { creatorId, communityId } = SocialUtilsManager.getCommunityBasicInfoFromUri(communityUri);
                communityInfo = await this.fetchCommunityInfo(creatorId, communityId);
            }
        }
        return {
            focusedNote,
            ancestorNotes,
            replies,
            quotedNotesMap,
            metadataByPubKeyMap,
            childReplyEventTagIds,
            communityInfo
        };
    }

    async createNoteCommunityMappings(notes: INostrEvent[]) {
        let noteCommunityInfoList: INoteCommunityInfo[] = [];
        let pubkeyToCommunityIdsMap: Record<string, string[]> = {};
        let communityInfoList: ICommunityInfo[] = [];
        for (let note of notes) {
            let scpData = SocialUtilsManager.extractScpData(note, ScpStandardId.CommunityPost);
            if (scpData) {
                const communityUri = this.retrieveCommunityUri(note, scpData);
                if (communityUri) {
                    const { creatorId, communityId } = SocialUtilsManager.getCommunityBasicInfoFromUri(communityUri);
                    pubkeyToCommunityIdsMap[creatorId] = pubkeyToCommunityIdsMap[creatorId] || [];
                    if (!pubkeyToCommunityIdsMap[creatorId].includes(communityId)) {
                        pubkeyToCommunityIdsMap[creatorId].push(communityId);
                    }
                    noteCommunityInfoList.push({
                        eventData: note,
                        communityUri,
                        communityId,
                        creatorId,
                    });
                }
            }
        }

        if (noteCommunityInfoList.length > 0) {
            const communityEvents = await this._socialEventManagerRead.fetchCommunities({
                pubkeyToCommunityIdsMap
            });
            for (let event of communityEvents) {
                let communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                communityInfoList.push(communityInfo);
            }

            //Fetch group keys only when scpData.encryptedKey is undefined for backward compatibility
            const keyEvents = await this._socialEventManagerRead.fetchGroupKeys({
                identifiers: communityInfoList.filter(v => !v.scpData?.encryptedKey).map(v => v.communityUri + ':keys')
            });

            for (let keyEvent of keyEvents) {
                const identifier = keyEvent.tags.find(tag => tag[0] === 'd')?.[1];
                const communityUri = identifier.replace(':keys', '');
                const communityInfo = communityInfoList.find(v => v.communityUri === communityUri);
                if (communityInfo) {
                    communityInfo.memberKeyMap = JSON.parse(keyEvent.content);
                }
            }
        }

        return {
            noteCommunityInfoList,
            communityInfoList
        }
    }

    async retrieveUserProfileDetail(options: { pubKey?: string; telegramAccount?: string }) {
        const { pubKey, telegramAccount } = options;
        let metadata: INostrMetadata;
        let stats: IUserActivityStats;
        const userProfileEvents = await this._socialEventManagerRead.fetchUserProfileDetailEvents({ pubKey, telegramAccount });
        for (let event of userProfileEvents) {
            if (event.kind === 0) {
                metadata = {
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                };
            }
            else if (event.kind === 10000105) {
                let content = SocialUtilsManager.parseContent(event.content);
                stats = {
                    notes: content.note_count,
                    replies: content.reply_count,
                    followers: content.followers_count,
                    following: content.follows_count,
                    relays: content.relay_count,
                    timeJoined: content.time_joined
                }
            }
        }
        if (!metadata) return null;
        let userProfile = SocialUtilsManager.constructUserProfile(metadata);
        return {
            userProfile,
            stats
        }
    }

    async fetchUserContactList(pubKey: string) {
        let metadataArr: INostrMetadata[] = [];
        let followersCountMap: Record<string, number> = {};
        const userContactEvents = await this._socialEventManagerRead.fetchContactListCacheEvents({
            pubKey,
            detailIncluded: true
        });
        for (let event of userContactEvents) {
            if (event.kind === 0) {
                metadataArr.push({
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                });
            }
            else if (event.kind === 10000108) {
                followersCountMap = SocialUtilsManager.parseContent(event.content);
            }
        }
        const userProfiles: IUserProfile[] = [];
        for (let metadata of metadataArr) {
            let userProfile = SocialUtilsManager.constructUserProfile(metadata, followersCountMap);
            userProfiles.push(userProfile);
        }
        return userProfiles;
    }

    async fetchUserFollowersList(pubKey: string) {
        let metadataArr: INostrMetadata[] = [];
        let followersCountMap: Record<string, number> = {};
        const userFollowersEvents = await this._socialEventManagerRead.fetchFollowersCacheEvents({ pubKey });
        for (let event of userFollowersEvents) {
            if (event.kind === 0) {
                metadataArr.push({
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                });
            }
            else if (event.kind === 10000108) {
                followersCountMap = SocialUtilsManager.parseContent(event.content);
            }
        }
        const userProfiles: IUserProfile[] = [];
        for (let metadata of metadataArr) {
            let userProfile = SocialUtilsManager.constructUserProfile(metadata, followersCountMap);
            userProfiles.push(userProfile);
        }
        return userProfiles;
    }

    async fetchUserRelayList(pubKey: string) {
        let relayList: string[] = [];
        const relaysEvents = await this._socialEventManagerRead.fetchUserRelays({ pubKey });
        const relaysEvent = relaysEvents.find(event => event.kind === 10000139);
        if (!relaysEvent) return relayList;
        relayList = relaysEvent.tags.filter(tag => tag[0] === 'r')?.map(tag => tag[1]) || [];
        relayList = Array.from(new Set(relayList));
        return relayList;
    }

    async followUser(userPubKey: string) {
        const decodedUserPubKey = userPubKey.startsWith('npub1') ? Nip19.decode(userPubKey).data as string : userPubKey;
        const contactListEvents = await this._socialEventManagerRead.fetchContactListCacheEvents({
            pubKey: this.selfPubkey,
            detailIncluded: false
        });
        let content = '';
        let contactPubKeys: Set<string> = new Set();
        let contactListEvent = contactListEvents.find(event => event.kind === 3);
        if (contactListEvent) {
            content = contactListEvent.content;
            contactPubKeys = new Set(contactListEvent.tags.filter(tag => tag[0] === 'p')?.map(tag => tag[1]) || []);
        }
        contactPubKeys.add(decodedUserPubKey);
        await this._socialEventManagerWrite.updateContactList(content, Array.from(contactPubKeys));
    }

    async unfollowUser(userPubKey: string) {
        const decodedUserPubKey = userPubKey.startsWith('npub1') ? Nip19.decode(userPubKey).data as string : userPubKey;
        const contactListEvents = await this._socialEventManagerRead.fetchContactListCacheEvents({
            pubKey: this.selfPubkey,
            detailIncluded: false
        });
        let content = '';
        let contactPubKeys: Set<string> = new Set();
        const contactListEvent = contactListEvents.find(event => event.kind === 3);
        if (contactListEvent) {
            content = contactListEvent.content;
            for (let tag of contactListEvent.tags) {
                if (tag[0] === 'p' && tag[1] !== decodedUserPubKey) {
                    contactPubKeys.add(tag[1]);
                }
            }
        }
        await this._socialEventManagerWrite.updateContactList(content, Array.from(contactPubKeys));
    }

    async generateGroupKeys(privateKey: string, encryptionPublicKeys: string[]) {
        const groupPrivateKey = Keys.generatePrivateKey();
        const groupPublicKey = Keys.getPublicKey(groupPrivateKey);
        let encryptedGroupKeys: Record<string, string> = {};
        for (let encryptionPublicKey of encryptionPublicKeys) {
            const encryptedGroupKey = await SocialUtilsManager.encryptMessage(privateKey, encryptionPublicKey, groupPrivateKey);
            encryptedGroupKeys[encryptionPublicKey] = encryptedGroupKey;
        }
        return {
            groupPrivateKey,
            groupPublicKey,
            encryptedGroupKeys
        }
    }

    async createCommunity(newInfo: INewCommunityInfo, creatorId: string) {
        const communityUri = SocialUtilsManager.getCommunityUri(creatorId, newInfo.name);
        let communityInfo: ICommunityInfo = {
            communityUri,
            communityId: newInfo.name,
            creatorId,
            description: newInfo.description,
            rules: newInfo.rules,
            bannerImgUrl: newInfo.bannerImgUrl,
            avatarImgUrl: newInfo.avatarImgUrl,
            moderatorIds: newInfo.moderatorIds,
            scpData: newInfo.scpData,
            membershipType: newInfo.membershipType,
            privateRelay: newInfo.privateRelay,
            gatekeeperNpub: newInfo.gatekeeperNpub,
            policies: newInfo.policies,
            pointSystem: newInfo.pointSystem,
            collectibles: newInfo.collectibles,
            parentCommunityUri: newInfo.parentCommunityUri
        }

        if (communityInfo.membershipType === MembershipType.Protected) {
            const gatekeeperPublicKey = Nip19.decode(communityInfo.gatekeeperNpub).data as string;
            const groupPrivateKey = Keys.generatePrivateKey();
            const groupPublicKey = Keys.getPublicKey(groupPrivateKey);
            const encryptedGroupKey = await SocialUtilsManager.encryptMessage(this._privateKey, gatekeeperPublicKey, groupPrivateKey);
            communityInfo.scpData = {
                ...communityInfo.scpData,
                publicKey: groupPublicKey,
                gatekeeperPublicKey,
                encryptedKey: encryptedGroupKey
            }
            if (communityInfo.scpData) {
                const result = await this.updateCommunityChannel(communityInfo);
                if (result.event.id) {
                    communityInfo.scpData.channelEventId = result.event.id;
                }
            }
        }
        await this._socialEventManagerWrite.updateCommunity(communityInfo);

        return communityInfo;
    }

    async updateCommunity(info: ICommunityInfo) {
        if (info.membershipType === MembershipType.Protected) {
            const gatekeeperPublicKey = Nip19.decode(info.gatekeeperNpub).data as string;
            if (info.scpData) {
                if (!info.scpData.encryptedKey || !info.scpData.gatekeeperPublicKey) {
                    const groupPrivateKey = await this.retrieveCommunityPrivateKey(info, this._privateKey);
                    const encryptedGroupKey = await SocialUtilsManager.encryptMessage(this._privateKey, gatekeeperPublicKey, groupPrivateKey);
                    info.scpData = {
                        ...info.scpData,
                        gatekeeperPublicKey,
                        encryptedKey: encryptedGroupKey
                    }
                }
            } 
            else {
                const groupPrivateKey = Keys.generatePrivateKey();
                const groupPublicKey = Keys.getPublicKey(groupPrivateKey);
                const encryptedGroupKey = await SocialUtilsManager.encryptMessage(this._privateKey, gatekeeperPublicKey, groupPrivateKey);
                info.scpData = {
                    ...info.scpData,
                    publicKey: groupPublicKey,
                    gatekeeperPublicKey,
                    encryptedKey: encryptedGroupKey
                }
            }
        }
        await this._socialEventManagerWrite.updateCommunity(info);
        return info;
    }

    async updateCommunityChannel(communityInfo: ICommunityInfo) {
        let channelScpData: IChannelScpData = {
            communityUri: communityInfo.communityUri
        }
        let channelInfo: IChannelInfo = {
            name: communityInfo.communityId,
            about: communityInfo.description,
            scpData: channelScpData
        }
        const updateChannelResponse = await this._socialEventManagerWrite.updateChannel(channelInfo);
        return updateChannelResponse;
    }

    async createChannel(channelInfo: IChannelInfo, memberIds: string[]) {
        let encryptionPublicKeys: string[] = [];
        for (let memberId of memberIds) {
            const memberPublicKey = Nip19.decode(memberId).data as string;
            encryptionPublicKeys.push(memberPublicKey);
        }
        const channelKeys = await this.generateGroupKeys(this._privateKey, encryptionPublicKeys);
        channelInfo.scpData = {
            ...channelInfo.scpData,
            publicKey: channelKeys.groupPublicKey
        }
        const result = await this._socialEventManagerWrite.updateChannel(channelInfo);
        if (result.event.id) {
            const channelUri = `40:${result.event.id}`;
            await this._socialEventManagerWrite.updateGroupKeys(
                channelUri + ':keys',
                40,
                JSON.stringify(channelKeys.encryptedGroupKeys),
                memberIds
            );
        }
        return channelInfo;
    }

    async updateChannel(channelInfo: IChannelInfo) {
        const updateChannelResponses = await this._socialEventManagerWrite.updateChannel(channelInfo);
        return updateChannelResponses;
    }

    async fetchCommunitiesMembers(communities: ICommunityInfo[]) {
        if (communities.length === 0) return {};
        const communityUriToMembersMap = await this._socialEventManagerRead.getCommunityUriToMembersMap(communities);
        return communityUriToMembersMap;
    }

    private getEventIdToMemberMap(events: INostrEvent[]) {
        const memberCountsEvents = events.filter(event => event.kind === 10000109);
        let eventIdToMemberCountMap: Record<string, number> = {};
        for (let event of memberCountsEvents) {
            const content = SocialUtilsManager.parseContent(event.content);
            eventIdToMemberCountMap[content.event_id] = content.member_count;
        }
        return eventIdToMemberCountMap;
    }

    async fetchCommunities(query?: string) {
        let communities: ICommunity[] = [];
        const events = await this._socialEventManagerRead.fetchCommunities({
            query
        });
        let eventIdToMemberCountMap = this.getEventIdToMemberMap(events);
        const communityEvents = events.filter(event => event.kind === 34550);
        for (let event of communityEvents) {
            const communityInfo = SocialUtilsManager.extractCommunityInfo(event);
            const memberCount = eventIdToMemberCountMap[event.id] || 0;
            let community: ICommunity = {
                ...communityInfo,
                members: [],
                memberCount
            }
            communities.push(community);
        }
        return communities;
    }

    async fetchMyCommunities(pubKey: string) {
        let communities: ICommunity[] = [];
        const events = await this._socialEventManagerRead.fetchAllUserRelatedCommunities({ pubKey });
        let eventIdToMemberCountMap = this.getEventIdToMemberMap(events);
        const communitiesEvents = events.filter(event => event.kind === 34550);
        for (let event of communitiesEvents) {
            const communityInfo = SocialUtilsManager.extractCommunityInfo(event);
            const memberCount = eventIdToMemberCountMap[event.id] || 0;
            let community: ICommunity = {
                ...communityInfo,
                members: [],
                memberCount
            }
            communities.push(community);
        }
        return communities;
    }

    async fetchUserRoleInCommunity(community: ICommunityInfo, pubKey: string) {
        if (!pubKey) return CommunityRole.None;
        if (community.creatorId === pubKey) return CommunityRole.Creator;
        if (community.moderatorIds?.includes(pubKey)) return CommunityRole.Moderator;
        const communities = await this._socialEventManagerRead.fetchUserBookmarkedCommunities({ pubKey });
        const decodedCreatorId = community.creatorId.startsWith('npub1') ? Nip19.decode(community.creatorId).data : community.creatorId;
        const isMember = communities.find(c => c.communityId === community.communityId && c.creatorId === decodedCreatorId) != null;
        return isMember ? CommunityRole.GeneralMember : CommunityRole.None;
    }

    async joinCommunity(community: ICommunityInfo, pubKey: string) {
        const communities = await this._socialEventManagerRead.fetchUserBookmarkedCommunities({ pubKey });
        communities.push(community);
        await this._socialEventManagerWrite.updateUserBookmarkedCommunities(communities);
        if (community.scpData?.channelEventId) {
            const channelEventIds = await this._socialEventManagerRead.fetchUserBookmarkedChannelEventIds({ pubKey });
            channelEventIds.push(community.scpData.channelEventId);
            await this._socialEventManagerWrite.updateUserBookmarkedChannels(channelEventIds);
        }
    }

    async leaveCommunity(community: ICommunityInfo, pubKey: string) {
        const communities = await this._socialEventManagerRead.fetchUserBookmarkedCommunities({
            pubKey,
            excludedCommunity: community
        });
        await this._socialEventManagerWrite.updateUserBookmarkedCommunities(communities);
        if (community.scpData?.channelEventId) {
            const channelEventIds = await this._socialEventManagerRead.fetchUserBookmarkedChannelEventIds({ pubKey });
            const index = channelEventIds.indexOf(community.scpData.channelEventId);
            if (index > -1) {
                channelEventIds.splice(index, 1);
            }
            await this._socialEventManagerWrite.updateUserBookmarkedChannels(channelEventIds);
        }
    }

    private async encryptMessageWithGeneratedKey(privateKey: string, theirPublicKey: string, message: string) {
        const messagePrivateKey = Keys.generatePrivateKey();
        const messagePublicKey = Keys.getPublicKey(messagePrivateKey);
        const encryptedMessageKey = await SocialUtilsManager.encryptMessage(privateKey, theirPublicKey, messagePrivateKey);
        const encryptedMessage = await SocialUtilsManager.encryptMessage(privateKey, messagePublicKey, message);
        return {
            encryptedMessage,
            encryptedMessageKey
        }
    }

    async submitCommunityPost(message: string, info: ICommunityInfo, conversationPath?: IConversationPath, timestamp?: number, alt?: string, isPublicPost: boolean = false) {
        const messageContent = {
            communityUri: info.communityUri,
            message,
        }
        let newCommunityPostInfo: INewCommunityPostInfo;
        if (info.membershipType === MembershipType.Open || isPublicPost) {
            newCommunityPostInfo = {
                community: info,
                message,
                timestamp,
                conversationPath
            }
        }
        else {
            const {
                encryptedMessage,
                encryptedMessageKey
            } = await this.encryptMessageWithGeneratedKey(this._privateKey, info.scpData.publicKey, JSON.stringify(messageContent));
            newCommunityPostInfo = {
                community: info,
                message: encryptedMessage,
                timestamp,
                conversationPath,
                scpData: {
                    encryptedKey: encryptedMessageKey,
                    communityUri: info.communityUri
                }
            }
        }
        if (alt) newCommunityPostInfo.alt = alt;
        const responses = await this._socialEventManagerWrite.submitCommunityPost(newCommunityPostInfo);
        return responses;
    }

    async fetchAllUserRelatedChannels(pubKey: string) {
        const {
            channels,
            channelMetadataMap,
            channelIdToCommunityMap
        } = await this._socialEventManagerRead.fetchAllUserRelatedChannels({ pubKey });

        let outputChannels: IChannelInfo[] = [];
        for (let channel of channels) {
            const channelMetadata = channelMetadataMap[channel.id];
            const communityInfo = channelIdToCommunityMap[channel.id];
            if (channelMetadata) {
                outputChannels.push({
                    ...channel,
                    ...channelMetadata,
                    communityInfo: communityInfo
                });
            }
            else {
                outputChannels.push({
                    ...channel,
                    communityInfo: communityInfo
                });
            }
        }

        return outputChannels;
    }

    async retrieveChannelMessages(channelId: string, since?: number, until?: number) {
        const events = await this._socialEventManagerRead.fetchChannelMessages({
            channelId,
            since,
            until
        });
        const messageEvents = events.filter(event => event.kind === 42);
        return messageEvents;
    }

    async retrieveChannelEvents(creatorId: string, channelId: string) {
        const channelEvents = await this._socialEventManagerRead.fetchChannelInfoMessages({ channelId });
        const messageEvents = channelEvents.filter(event => event.kind === 42);
        const channelCreationEvent = channelEvents.find(event => event.kind === 40);
        if (!channelCreationEvent) throw new Error('No info event found');
        const channelMetadataEvent = channelEvents.find(event => event.kind === 41);
        let channelInfo: IChannelInfo;
        if (channelMetadataEvent) {
            channelInfo = SocialUtilsManager.extractChannelInfo(channelMetadataEvent);
        }
        else {
            channelInfo = SocialUtilsManager.extractChannelInfo(channelCreationEvent);
        }
        if (!channelInfo) throw new Error('No info event found');

        return {
            messageEvents,
            info: channelInfo
        }
    }

    async retrieveChannelMessageKeys(options: IRetrieveChannelMessageKeysOptions) {
        let messageIdToPrivateKey: Record<string, string> = {};
        if (options.gatekeeperUrl) {
            const authHeader = SocialUtilsManager.constructAuthHeader(this._privateKey);
            let bodyData = {
                creatorId: options.creatorId,
                channelId: options.channelId,
                message: options.message,
                signature: options.signature
            };
            let url = `${options.gatekeeperUrl}/channels/message-keys`;
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: authHeader
                },
                body: JSON.stringify(bodyData)
            });
            let result = await response.json();
            if (result.success) {
                messageIdToPrivateKey = result.data;
            }
        }
        else if (options.privateKey) {
            let groupPrivateKey;
            const channelEvents = await this.retrieveChannelEvents(options.creatorId, options.channelId);
            const channelInfo = channelEvents.info;
            const messageEvents = channelEvents.messageEvents;
            if (channelInfo.scpData.communityUri) {
                const { communityId } = SocialUtilsManager.getCommunityBasicInfoFromUri(channelInfo.scpData.communityUri);
                const communityInfo = await this.fetchCommunityInfo(channelInfo.eventData.pubkey, communityId);
                groupPrivateKey = await this.retrieveCommunityPrivateKey(communityInfo, options.privateKey);
                if (!groupPrivateKey) return messageIdToPrivateKey;
            }
            else {
                const groupUri = `40:${channelInfo.id}`;
                const keyEvents = await this._socialEventManagerRead.fetchGroupKeys({
                    identifiers: [groupUri + ':keys']
                });
                const keyEvent = keyEvents[0];
                if (keyEvent) {
                    const creatorPubkey = channelInfo.eventData.pubkey;
                    const memberKeyMap = JSON.parse(keyEvent.content);
                    const encryptedKey = memberKeyMap?.[this.selfPubkey];
                    if (encryptedKey) {
                        groupPrivateKey = await SocialUtilsManager.decryptMessage(options.privateKey, creatorPubkey, encryptedKey);
                    }
                }
            }
            for (const messageEvent of messageEvents) {
                const messagePrivateKey = await this.retrieveChannelMessagePrivateKey(messageEvent, channelInfo.id, groupPrivateKey);
                if (messagePrivateKey) {
                    messageIdToPrivateKey[messageEvent.id] = messagePrivateKey;
                }
            }
        }
        return messageIdToPrivateKey;
    }

    async submitChannelMessage(
        message: string,
        channelId: string,
        communityPublicKey: string,
        conversationPath?: IConversationPath
    ) {
        const messageContent = {
            channelId,
            message,
        }
        const {
            encryptedMessage,
            encryptedMessageKey
        } = await this.encryptMessageWithGeneratedKey(this._privateKey, communityPublicKey, JSON.stringify(messageContent));
        const newChannelMessageInfo: INewChannelMessageInfo = {
            channelId: channelId,
            message: encryptedMessage,
            conversationPath,
            scpData: {
                encryptedKey: encryptedMessageKey,
                channelId: channelId
            }
        }
        await this._socialEventManagerWrite.submitChannelMessage(newChannelMessageInfo);
    }

    async fetchDirectMessagesBySender(selfPubKey: string, senderPubKey: string, since?: number, until?: number) {
        const decodedSenderPubKey = Nip19.decode(senderPubKey).data as string;
        const events = await this._socialEventManagerRead.fetchDirectMessages({
            pubKey: selfPubKey,
            sender: decodedSenderPubKey,
            since,
            until
        });
        let metadataByPubKeyMap: Record<string, INostrMetadata> = {};
        const encryptedMessages = [];
        for (let event of events) {
            if (event.kind === 0) {
                metadataByPubKeyMap[event.pubkey] = {
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                };
            } else if (event.kind === 4) {
                encryptedMessages.push(event);
            }
        }
        return {
            decodedSenderPubKey,
            encryptedMessages,
            metadataByPubKeyMap
        };
    }

    async sendDirectMessage(chatId: string, message: string, replyToEventId?: string) {
        const decodedReceiverPubKey = Nip19.decode(chatId).data as string;
        const content = await SocialUtilsManager.encryptMessage(this._privateKey, decodedReceiverPubKey, message);
        const result = await this._socialEventManagerWrite.sendMessage({
            receiver: decodedReceiverPubKey,
            encryptedMessage: content, 
            replyToEventId
        });
        return result;
    }

    async sendTempMessage(options: ISendTempMessageOptions) {
        const { receiverId, message, replyToEventId, widgetId } = options;
        const decodedReceiverPubKey = Nip19.decode(receiverId).data as string;
        const content = await SocialUtilsManager.encryptMessage(this._privateKey, decodedReceiverPubKey, message);
        const result = await this._socialEventManagerWrite.sendTempMessage({
            receiver: decodedReceiverPubKey,
            encryptedMessage: content,
            replyToEventId,
            widgetId
        });
        return result;
    }

    async resetMessageCount(selfPubKey: string, senderPubKey: string) {
        await this._socialEventManagerRead.resetMessageCount({
            pubKey: selfPubKey,
            sender: senderPubKey
        });
    }

    async fetchMessageContacts(pubKey: string) {
        const events = await this._socialEventManagerRead.fetchMessageContactsCacheEvents({ pubKey });
        const pubkeyToMessageInfoMap: Record<string, { cnt: number, latest_at: number, latest_event_id: string }> = {};
        let metadataByPubKeyMap: Record<string, INostrMetadata> = {};
        for (let event of events) {
            if (event.kind === 10000118) {
                const content = SocialUtilsManager.parseContent(event.content);
                Object.keys(content).forEach(pubkey => {
                    pubkeyToMessageInfoMap[pubkey] = content[pubkey];
                })
            }
            if (event.kind === 0) {
                metadataByPubKeyMap[event.pubkey] = {
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                };
            }
        }
        let profiles: IMessageContactInfo[] = Object.entries(metadataByPubKeyMap).map(([k, v]) => {
            const encodedPubkey = Nip19.npubEncode(k);
            return {
                id: encodedPubkey,
                pubKey: k,
                creatorId: encodedPubkey,
                username: v.content.name,
                displayName: v.content.display_name,
                avatar: v.content.picture,
                banner: v.content.banner,
                latestAt: pubkeyToMessageInfoMap[k].latest_at,
                cnt: pubkeyToMessageInfoMap[k].cnt
            }
        });

        const channels = await this.fetchAllUserRelatedChannels(pubKey);
        for (let channel of channels) {
            let creatorId = Nip19.npubEncode(channel.eventData.pubkey);
            profiles.push({
                id: channel.id,
                pubKey: channel.eventData.pubkey,
                creatorId,
                username: channel.name,
                displayName: channel.name,
                avatar: channel.picture || channel.communityInfo?.avatarImgUrl,
                banner: '',
                latestAt: 0,
                cnt: 0,
                isGroup: true,
                channelInfo: channel
            });
        }
        const invitations = await this.fetchUserGroupInvitations(pubKey);
        console.log('invitations', invitations);
        return profiles;
    }

    async fetchUserGroupInvitations(pubKey: string) {
        const identifiers: string[] = [];
        const events = await this._socialEventManagerRead.fetchUserGroupInvitations({
            groupKinds: [40, 34550],
            pubKey
        });
        for (let event of events) {
            const identifier = event.tags.find(tag => tag[0] === 'd')?.[1];
            if (identifier) {
                identifiers.push(identifier);
            }
        }
        return identifiers;
    }

    async updateCalendarEvent(updateCalendarEventInfo: IUpdateCalendarEventInfo) {
        const geohash = Geohash.encode(updateCalendarEventInfo.latitude, updateCalendarEventInfo.longitude);
        updateCalendarEventInfo = {
            ...updateCalendarEventInfo,
            geohash
        }
        let naddr: string;
        const responses = await this._socialEventManagerWrite.updateCalendarEvent(updateCalendarEventInfo);
        const response = responses[0];
        if (response.success) {
            naddr = Nip19.naddrEncode({
                identifier: updateCalendarEventInfo.id,
                pubkey: this.selfPubkey,
                kind: updateCalendarEventInfo.type === CalendarEventType.DateBased ? 31922 : 31923,
                relays: []
            });
        }
        return naddr;
    }

    async retrieveCalendarEventsByDateRange(start: number, end?: number, limit?: number, previousEventId?: string) {
        const result = await this._socialEventManagerRead.fetchCalendarEvents({
            start,
            end,
            limit,
            previousEventId
        });
        let calendarEventInfoList: ICalendarEventInfo[] = [];
        for (let event of result.events) {
            let calendarEventInfo = SocialUtilsManager.extractCalendarEventInfo(event);
            calendarEventInfoList.push(calendarEventInfo);
        }
        return {
            calendarEventInfoList,
            startDates: result.data?.dates as number[]
        };
    }

    async retrieveCalendarEvent(naddr: string) {
        let address = Nip19.decode(naddr).data as Nip19.AddressPointer;
        const calendarEvent = await this._socialEventManagerRead.fetchCalendarEvent({ address });
        if (!calendarEvent) return null;
        let calendarEventInfo = SocialUtilsManager.extractCalendarEventInfo(calendarEvent);
        let hostPubkeys = calendarEvent.tags.filter(tag => tag[0] === 'p' && tag[3] === 'host')?.map(tag => tag[1]) || [];
        const calendarEventUri = `${address.kind}:${address.pubkey}:${address.identifier}`;
        let hosts: ICalendarEventHost[] = [];
        let attendees: ICalendarEventAttendee[] = [];
        let attendeePubkeys: string[] = [];
        let attendeePubkeyToEventMap: Record<string, INostrEvent> = {};
        const postEvents = await this._socialEventManagerRead.fetchCalendarEventPosts({ calendarEventUri });
        const notes: INoteInfo[] = [];
        for (let postEvent of postEvents) {
            const note: INoteInfo = {
                eventData: postEvent
            }
            notes.push(note);
        }
        const rsvpEvents = await this._socialEventManagerRead.fetchCalendarEventRSVPs({ calendarEventUri });
        for (let rsvpEvent of rsvpEvents) {
            if (attendeePubkeyToEventMap[rsvpEvent.pubkey]) continue;
            let attendanceStatus = rsvpEvent.tags.find(tag => tag[0] === 'l' && tag[2] === 'status')?.[1];
            if (attendanceStatus === 'accepted') {
                attendeePubkeyToEventMap[rsvpEvent.pubkey] = rsvpEvent;
                attendeePubkeys.push(rsvpEvent.pubkey);
            }
        }
        const userProfileEvents = await this._socialEventManagerRead.fetchUserProfileCacheEvents({
            pubKeys: [
                ...hostPubkeys,
                ...attendeePubkeys
            ]
        })
        for (let event of userProfileEvents) {
            if (event.kind === 0) {
                let metaData = {
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                };
                let userProfile = SocialUtilsManager.constructUserProfile(metaData);
                if (hostPubkeys.includes(event.pubkey)) {
                    let host: ICalendarEventHost = {
                        pubkey: event.pubkey,
                        userProfile
                    }
                    hosts.push(host);
                }
                else if (attendeePubkeyToEventMap[event.pubkey]) {
                    let attendee: ICalendarEventAttendee = {
                        pubkey: event.pubkey,
                        userProfile,
                        rsvpEventData: attendeePubkeyToEventMap[event.pubkey]
                    }
                    attendees.push(attendee);
                }
            }
        }
        let detailInfo: ICalendarEventDetailInfo = {
            ...calendarEventInfo,
            hosts,
            attendees,
            notes
        }
        return detailInfo;
    }

    async acceptCalendarEvent(rsvpId: string, naddr: string) {
        let address = Nip19.decode(naddr).data as Nip19.AddressPointer;
        const calendarEventUri = `${address.kind}:${address.pubkey}:${address.identifier}`;
        const rsvpEvents = await this._socialEventManagerRead.fetchCalendarEventRSVPs({
            calendarEventUri,
            pubkey: this.selfPubkey
        });
        if (rsvpEvents.length > 0) {
            rsvpId = rsvpEvents[0].tags.find(tag => tag[0] === 'd')?.[1];
        }
        await this._socialEventManagerWrite.createCalendarEventRSVP(rsvpId, calendarEventUri, true);
    }

    async declineCalendarEvent(rsvpId: string, naddr: string) {
        let address = Nip19.decode(naddr).data as Nip19.AddressPointer;
        const calendarEventUri = `${address.kind}:${address.pubkey}:${address.identifier}`;
        const rsvpEvents = await this._socialEventManagerRead.fetchCalendarEventRSVPs({
            calendarEventUri,
            pubkey: this.selfPubkey
        });
        if (rsvpEvents.length > 0) {
            rsvpId = rsvpEvents[0].tags.find(tag => tag[0] === 'd')?.[1];
        }
        await this._socialEventManagerWrite.createCalendarEventRSVP(rsvpId, calendarEventUri, false);
    }

    async submitCalendarEventPost(naddr: string, message: string, conversationPath?: IConversationPath) {
        let address = Nip19.decode(naddr).data as Nip19.AddressPointer;
        const calendarEventUri = `${address.kind}:${address.pubkey}:${address.identifier}`;
        let info: INewCalendarEventPostInfo = {
            calendarEventUri,
            message,
            conversationPath
        }
        const responses = await this._socialEventManagerWrite.submitCalendarEventPost(info);
        const response = responses[0];
        return response.success ? response.eventId : null;
    }

    async fetchTimezones() {
        const apiUrl = `${this._apiBaseUrl}/timezones`;
        const apiResponse = await fetch(apiUrl);
        const apiResult = await apiResponse.json();
        if (!apiResult.success) throw new Error(apiResult.error.message);
        let timezones: any[] = [];
        for (let timezone of apiResult.data.timezones) {
            let gmtOffset = SocialUtilsManager.getGMTOffset(timezone.timezoneName);
            if (!gmtOffset) continue;
            timezones.push({
                timezoneName: timezone.timezoneName,
                description: timezone.description,
                gmtOffset: gmtOffset
            });
        }
        timezones.sort((a, b) => {
            if (a.gmtOffset.startsWith('GMT-') && b.gmtOffset.startsWith('GMT+')) return -1;
            if (a.gmtOffset.startsWith('GMT+') && b.gmtOffset.startsWith('GMT-')) return 1;
            if (a.gmtOffset.startsWith('GMT-')) {
                if (a.gmtOffset < b.gmtOffset) return 1;
                if (a.gmtOffset > b.gmtOffset) return -1;
            }
            else {
                if (a.gmtOffset > b.gmtOffset) return 1;
                if (a.gmtOffset < b.gmtOffset) return -1;
            }
            if (a.description < b.description) return -1;
            if (a.description > b.description) return 1;
            return 0;
        });
        return timezones;
    }

    async fetchCitiesByKeyword(keyword: string) {
        const apiUrl = `${this._apiBaseUrl}/cities?keyword=${keyword}`;
        const apiResponse = await fetch(apiUrl);
        const apiResult = await apiResponse.json();
        if (!apiResult.success) throw new Error(apiResult.error.message);
        let cities: any[] = [];
        for (let city of apiResult.data.cities) {
            cities.push({
                id: city.id,
                city: city.city,
                cityAscii: city.cityAscii,
                latitude: city.lat,
                longitude: city.lng,
                country: city.country
            });
        }
        return cities;
    }

    async fetchCitiesByCoordinates(latitude: number, longitude: number) {
        const apiUrl = `${this._apiBaseUrl}/cities?lat=${latitude}&lng=${longitude}`;
        const apiResponse = await fetch(apiUrl);
        const apiResult = await apiResponse.json();
        if (!apiResult.success) throw new Error(apiResult.error.message);
        let cities: any[] = [];
        for (let city of apiResult.data.cities) {
            cities.push({
                id: city.id,
                city: city.city,
                cityAscii: city.cityAscii,
                latitude: city.lat,
                longitude: city.lng,
                country: city.country
            });
        }
        return cities;
    }

    async fetchLocationInfoFromIP() {
        if (!this._ipLocationServiceBaseUrl) return null;
        const response = await fetch(this._ipLocationServiceBaseUrl);
        const result = await response.json();
        let locationInfo: ILocationCoordinates;
        if (result.success) {
            locationInfo = {
                latitude: result.data.lat,
                longitude: result.data.long
            }
        }
        return locationInfo;
    }

    // private async fetchEventMetadataFromIPFS(ipfsBaseUrl: string, eventId: string) {
    //     const url = `${ipfsBaseUrl}/nostr/${eventId}`;
    //     const response = await fetch(url);
    //     const result = await response.json();
    //     return result;
    // }

    async getAccountBalance(walletAddress: string) {
        const apiUrl = 'https://rpc.ankr.com/multichain/79258ce7f7ee046decc3b5292a24eb4bf7c910d7e39b691384c7ce0cfb839a01/?ankr_getAccountBalance';
        const bodyData = {
            jsonrpc: '2.0',
            method: 'ankr_getAccountBalance',
            params: {
                blockchain: [
                    'bsc',
                    'avalanche'
                ],
                walletAddress
            },
            id: 1
        }
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyData)
        });
        const data = await response.json();
        if (data.error) {
            console.log('error', data.error);
            return null;
        }
        return data.result;
    }

    async getNFTsByOwner(walletAddress: string) {
        const apiUrl = 'https://rpc.ankr.com/multichain/79258ce7f7ee046decc3b5292a24eb4bf7c910d7e39b691384c7ce0cfb839a01/?ankr_getNFTsByOwner';
        const bodyData = {
            jsonrpc: '2.0',
            method: 'ankr_getNFTsByOwner',
            params: {
                blockchain: [
                    'bsc',
                    'avalanche'
                ],
                walletAddress
            },
            id: 1
        }
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyData)
        });
        const data = await response.json();
        if (data.error) {
            console.log('error', data.error);
            return null;
        }
        return data.result;
    }

    async submitMessage(message: string, conversationPath?: IConversationPath, createdAt?: number) {
        return this._socialEventManagerWrite.postNote(message, conversationPath, createdAt);
    }

    async submitLongFormContent(info: ILongFormContentInfo) {
        return this._socialEventManagerWrite.submitLongFormContentEvents(info);
    }

    async submitLike(postEventData: INostrEvent) {
        let tags: string[][] = postEventData.tags.filter(
            tag => tag.length >= 2 && (tag[0] === 'e' || tag[0] === 'p')
        );
        tags.push(['e', postEventData.id]);
        tags.push(['p', postEventData.pubkey]);
        tags.push(['k', postEventData.kind.toString()]);
        await this._socialEventManagerWrite.submitLike(tags);
    }

    async submitRepost(postEventData: INostrEvent) {
        let tags: string[][] = [
            [
                'e',
                postEventData.id
            ],
            [
                'p',
                postEventData.pubkey
            ]
        ]
        const content = JSON.stringify(postEventData);
        await this._socialEventManagerWrite.submitRepost(content, tags);
    }

    async sendPingRequest(pubkey: string, relayUrl: string = this._publicIndexingRelay) {
        const authHeader = SocialUtilsManager.constructAuthHeader(this._privateKey);
        const data = {
            pubkey: pubkey,
        };
        let result
        try {
            let response = await fetch(relayUrl + '/ping', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: authHeader
                },
                body: JSON.stringify(data)
            });
            result = await response.json();
        }
        catch (err) {
        }
        return result;
    }

    async checkRelayStatus(pubkey: string, relayUrl?: string): Promise<ICheckRelayStatusResult> {
        if (!relayUrl) relayUrl = this._publicIndexingRelay;
        const authHeader = SocialUtilsManager.constructAuthHeader(this._privateKey);
        const data = {
            pubkey: pubkey,
        };
        let result
        try {
            let response = await fetch(relayUrl + '/check-status', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: authHeader
                },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                result = await response.json();
            }
            else if (response.status === 401) {
                result = {
                    success: false,
                    error: 'Access Denied: You do not have permission to access this relay.'
                }
            }
        }
        catch (err) {
        }
        return result;
    }

    async searchUsers(query: string) {
        const events = await this._socialEventManagerRead.searchUsers({ query });
        let metadataArr: INostrMetadata[] = [];
        let followersCountMap: Record<string, number> = {};
        for (let event of events) {
            if (event.kind === 0) {
                metadataArr.push({
                    ...event,
                    content: SocialUtilsManager.parseContent(event.content)
                });
            }
            else if (event.kind === 10000108) {
                followersCountMap = SocialUtilsManager.parseContent(event.content);
            }
        }
        const userProfiles: IUserProfile[] = [];
        for (let metadata of metadataArr) {
            let userProfile = SocialUtilsManager.constructUserProfile(metadata, followersCountMap);
            userProfiles.push(userProfile);
        }
        return userProfiles;
    }

    async addRelay(url: string) {
        const relaysEvents = await this._socialEventManagerRead.fetchUserRelays({
            pubKey: this.selfPubkey
        });
        const relaysEvent = relaysEvents.find(event => event.kind === 10000139);
        let relays: Record<string, IRelayConfig> = { [url]: { write: true, read: true } };
        if (relaysEvent) {
            for (let tag of relaysEvent.tags) {
                if (tag[0] !== 'r') continue;
                let config: IRelayConfig = { read: true, write: true };
                if (tag[2] === 'write') {
                    config.read = false;
                }
                if (tag[2] === 'read') {
                    config.write = false;
                }
                relays[tag[1]] = config;
            }
        }
        await this._socialEventManagerWrite.updateRelayList(relays);
    }

    async removeRelay(url: string) {
        const relaysEvents = await this._socialEventManagerRead.fetchUserRelays({
            pubKey: this.selfPubkey
        });
        const relaysEvent = relaysEvents.find(event => event.kind === 10000139);
        let relays: Record<string, IRelayConfig> = {};
        if (relaysEvent) {
            for (let tag of relaysEvent.tags) {
                if (tag[0] !== 'r' || tag[1] === url) continue;
                let config: IRelayConfig = { read: true, write: true };
                if (tag[2] === 'write') {
                    config.read = false;
                }
                if (tag[2] === 'read') {
                    config.write = false;
                }
                relays[tag[1]] = config;
            }
        }
        await this._socialEventManagerWrite.updateRelayList(relays);
    }

    async updateRelays(add: string[], remove: string[], defaultRelays: string[]) {
        const relaysEvents = await this._socialEventManagerRead.fetchUserRelays({
            pubKey: this.selfPubkey
        });
        const relaysEvent = relaysEvents.find(event => event.kind === 10000139);
        let relaysMap: Record<string, IRelayConfig> = {};
        for (let relay of add) {
            relaysMap[relay] = { read: true, write: true };
        }
        if (relaysEvent) {
            for (let tag of relaysEvent.tags) {
                if (tag[0] !== 'r' || remove.includes(tag[1])) continue;
                let config: IRelayConfig = { read: true, write: true };
                if (tag[2] === 'write') {
                    config.read = false;
                }
                if (tag[2] === 'read') {
                    config.write = false;
                }
                relaysMap[tag[1]] = config;
            }
        }
        let relayUrls = Object.keys(relaysMap);
        // this.relays = relayUrls.length > 0 ? relayUrls : defaultRelays;
        await this._socialEventManagerWrite.updateRelayList(relaysMap);
        return relayUrls;
    }

    async makeInvoice(amount: string, comment: string) {
        const paymentRequest = await this.lightningWalletManager.makeInvoice(Number(amount), comment);
        await this._socialEventManagerWrite.createPaymentRequestEvent(paymentRequest, amount, comment, true);
        return paymentRequest;
    }

    async createPaymentRequest(chainId: number, token: any, amount: string, to: string, comment: string) {
        const paymentRequest = btoa(JSON.stringify({
            chainId,
            token,
            amount,
            comment,
            to,
            createdAt: Math.round(Date.now() / 1000)
        }));
        await this._socialEventManagerWrite.createPaymentRequestEvent(paymentRequest, amount, comment);
        return paymentRequest;
    }

    parsePaymentRequest(paymentRequest: string) {
        const decoded = atob(paymentRequest);
        let data = JSON.parse(decoded);
        return data;
    }

    private async sendToken(paymentRequest: string) {
        let receipt: TransactionReceipt;
        try {
            let data = this.parsePaymentRequest(paymentRequest);
            const wallet = Wallet.getClientInstance();
            await wallet.init();
            if (data.chainId !== wallet.chainId) {
                await wallet.switchNetwork(data.chainId);
            }
            if (data.token.address) {
                const erc20 = new Contracts.ERC20(wallet, data.token.address);
                let amount = Utils.toDecimals(data.amount, data.token.decimals);
                receipt = await erc20.transfer({
                    to: data.to,
                    amount: amount
                });
            } else {
                receipt = await wallet.send(data.to, data.amount);
            }
        } catch (err) {
            throw new Error('Payment failed');
        }
        return receipt?.transactionHash;
    }

    private isLightningInvoice(value: string) {
        const lnRegex = /^(lnbc|lntb|lnbcrt|lnsb|lntbs)([0-9]+(m|u|n|p))?1\S+/g;
        return lnRegex.test(value);
    }

    async sendPayment(paymentRequest: string, comment: string) {
        let preimage: string;
        let tx: string;
        if (this.isLightningInvoice(paymentRequest)) {
            preimage = await this.lightningWalletManager.sendPayment(paymentRequest);
        } else {
            tx = await this.sendToken(paymentRequest);
        }
        const requestEvent = await this._socialEventManagerRead.fetchPaymentRequestEvent({ paymentRequest });
        if (requestEvent) {
            await this._socialEventManagerWrite.createPaymentReceiptEvent(requestEvent.id, requestEvent.pubkey, comment, preimage, tx);
        }
        return preimage || tx;
    }

    async zap(pubkey: string, lud16: string, amount: string, noteId: string) {
        const response = await this.lightningWalletManager.zap(pubkey, lud16, Number(amount), '', this._writeRelays, noteId);
        return response as any;
    }

    async fetchUserPaymentActivities(pubkey: string, since?: number, until?: number) {
        const paymentActivitiesForSender = await this._socialEventManagerRead.fetchPaymentActivitiesForSender({
            pubkey,
            since,
            until
        });
        const paymentActivitiesForRecipient = await this._socialEventManagerRead.fetchPaymentActivitiesForRecipient({
            pubkey,
            since,
            until
        });
        const paymentActivities = [...paymentActivitiesForSender, ...paymentActivitiesForRecipient];
        return paymentActivities.sort((a, b) => b.createdAt - a.createdAt);
    }

    async fetchPaymentReceiptInfo(paymentRequest: string) {
        let info: {
            status: 'pending' | 'completed';
            preimage?: string;
            tx?: string;
        } = {
            status: 'pending'
        };
        const requestEvent = await this._socialEventManagerRead.fetchPaymentRequestEvent({ paymentRequest });
        if (requestEvent) {
            const receiptEvent = await this._socialEventManagerRead.fetchPaymentReceiptEvent({
                requestEventId: requestEvent.id
            });
            if (receiptEvent && receiptEvent.pubkey === this.selfPubkey) {
                info.status = 'completed';
                info.preimage = receiptEvent.tags.find(tag => tag[0] === 'preimage')?.[1];
                info.tx = receiptEvent.tags.find(tag => tag[0] === 'tx')?.[1];
            }
        }
        return info;
    }

    async getLightningBalance() {
        const response = await this.lightningWalletManager.getBalance();
        return response;
    }

    isLightningAvailable() {
        const isAvailable = this.lightningWalletManager.isAvailable();
        return isAvailable;
    }

    async getBitcoinPrice() {
        const response = await fetch('https://api.coinpaprika.com/v1/tickers/btc-bitcoin')
        const result = await response.json();
        const price = result.quotes.USD.price;
        return price;
    }

    async fetchUserPrivateRelay(pubkey: string) {
        const url = `${this._publicIndexingRelay}/private-relay?pubkey=${pubkey}`;
        const response = await fetch(url);
        const result = await response.json();
        return result.data.relay;
    }

    async fetchApps(keyword?: string) {
        let url = `${this._apiBaseUrl}/apps`;
        if (keyword !== undefined)
            url += `?keyword=${keyword}`;
        try {
            const response = await fetch(url);
            const result = await response.json();
            return result.data.apps;
        }
        catch (e) {
            console.log('e', e)
        }
    }

    async fetchApp(pubkey: string, id: string) {
        const installed = await this.fetchInstalledByPubKey(pubkey);
        let installedVersionId;
        if (installed)
            installedVersionId = installed[id];
        const url = `${this._apiBaseUrl}/app`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id,
                pubkey,
                installedVersionId
            })
        });
        const result = await response.json();
        return result.data.app;
    }

    async fetchInstalledByPubKey(pubkey: string) {
        const url = `${this._apiBaseUrl}/installed?pubkey=${pubkey}`;
        const response = await fetch(url);
        const result = await response.json();
        const installed = result.data.installed;
        // const decrypted = await SocialUtilsManager.decryptMessage(this._privateKey, pubkey, installed);
        if (!installed)
            return null;
        const decrypted = await Crypto.decryptWithPrivKey(this._privateKey, installed);
        console.log('decrypted', decrypted);
        return JSON.parse(decrypted);
    }

    async fetchInstalledApps(pubkey: string) {
        const installed = await this.fetchInstalledByPubKey(pubkey);
        if (!installed)
            return [];
        // const decrypted = await SocialUtilsManager.decryptMessage(this._privateKey, pubkey, installed);
        const url = `${this._apiBaseUrl}/installed-apps`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pubkey,
                decryptedInstalled: JSON.stringify(installed)
            })
        });
        const result = await response.json();
        return result.data.installedApps;
    }

    async installApp(pubkey: string, appId: string, appVersionId: string) {
        const url = `${this._apiBaseUrl}/install-app`;
        const installedApps = await this.fetchInstalledByPubKey(pubkey);
        // console.log('installed', installed);
        // const decryptedInstalled = await SocialUtilsManager.decryptMessage(this._privateKey, pubkey, installed);
        // console.log('decryptedInstalled', decryptedInstalled)
        // const installedApps =  JSON.parse(decryptedInstalled);
        // console.log('installedApps', installedApps);
        let newInstalledApps: any = {};
        if (installedApps)
            newInstalledApps = { ...installedApps };
        newInstalledApps[appId] = appVersionId;

        // const encryptedInstalledAppList = await SocialUtilsManager.encryptMessage(this._privateKey, pubkey, JSON.stringify(newInstalledApps));
        const encryptedInstalledAppList = await Crypto.encryptWithPubKey(pubkey, JSON.stringify(newInstalledApps));
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pubkey,
                installedAppList: encryptedInstalledAppList
            })
        });
        const result = await response.json();
        return result;
    }

    async fetchCommunityPinnedNotes(creatorId: string, communityId: string) {
        const events = await this._socialEventManagerRead.fetchCommunityPinnedNotesEvents({
            creatorId,
            communityId
        });
        const {
            notes,
            metadataByPubKeyMap
        } = this.createNoteEventMappings(events);
        return {
            notes,
            metadataByPubKeyMap
        }
    }

    async pinCommunityNote(creatorId: string, communityId: string, noteId: string) {
        let noteIds = await this._socialEventManagerRead.fetchCommunityPinnedNoteIds({
            creatorId,
            communityId
        });
        noteIds = Array.from(new Set([...noteIds, noteId]));
        await this._socialEventManagerWrite.updateCommunityPinnedNotes(creatorId, communityId, noteIds);
    }

    async unpinCommunityNote(creatorId: string, communityId: string, noteId: string) {
        let noteIds = await this._socialEventManagerRead.fetchCommunityPinnedNoteIds({
            creatorId,
            communityId
        });
        noteIds = Array.from(new Set(noteIds));
        const index = noteIds.indexOf(noteId);
        if (index > -1) {
            noteIds.splice(index, 1);
        }
        await this._socialEventManagerWrite.updateCommunityPinnedNotes(creatorId, communityId, noteIds);
    }

    async fetchUserPinnedNotes(pubKey: string) {
        const pinnedNotesEvent = await this._socialEventManagerRead.fetchUserPinnedNotes({ pubKey });
        let noteIds = [];
        if (pinnedNotesEvent) {
            for (let tag of pinnedNotesEvent.tags) {
                if (tag[0] === 'e') {
                    noteIds.push(tag[1]);
                }
            }
        }
        if (noteIds.length > 0)
            return this._socialEventManagerRead.fetchEventsByIds({ ids: noteIds });
        else
            return [];
    }

    async pinUserNote(pubKey: string, noteId: string) {
        const pinnedNotesEvent = await this._socialEventManagerRead.fetchUserPinnedNotes({ pubKey });
        let noteIds = [noteId];
        if (pinnedNotesEvent) {
            for (let tag of pinnedNotesEvent.tags) {
                if (tag[0] === 'e' && tag[1] !== noteId) {
                    noteIds.push(tag[1]);
                }
            }
        }
        await this._socialEventManagerWrite.updateUserPinnedNotes(noteIds);
    }

    async unpinUserNote(pubKey: string, noteId: string) {
        const pinnedNotesEvent = await this._socialEventManagerRead.fetchUserPinnedNotes({ pubKey });
        let noteIds = [];
        if (pinnedNotesEvent) {
            for (let tag of pinnedNotesEvent.tags) {
                if (tag[0] === 'e' && tag[1] !== noteId) {
                    noteIds.push(tag[1]);
                }
            }
        }
        await this._socialEventManagerWrite.updateUserPinnedNotes(noteIds);
    }
    
    async fetchUserBookmarks(pubKey: string) {
        const bookmarksEvent = await this._socialEventManagerRead.fetchUserBookmarks({ pubKey });
        const eventIds: string[] = [];
        if (bookmarksEvent) {
            for (let tag of bookmarksEvent.tags) {
                if (tag[0] === 'e' || tag[0] === 'a') {
                    eventIds.push(tag[1]);
                }
            }
        }
        return eventIds;
    }

    async addBookmark(pubKey: string, eventId: string, isArticle: boolean = false) {
        const bookmarksEvent = await this._socialEventManagerRead.fetchUserBookmarks({ pubKey });
        let tags: string[][] = [
            [isArticle ? "a" : "e", eventId]
        ];
        if (bookmarksEvent) {
            for (let tag of bookmarksEvent.tags) {
                if (tag[1] !== eventId) {
                    tags.push(tag);
                }
            }
        }
        await this._socialEventManagerWrite.updateUserBookmarks(tags);
    }

    async removeBookmark(pubKey: string, eventId: string, isArticle: boolean = false) {
        const bookmarksEvent = await this._socialEventManagerRead.fetchUserBookmarks({ pubKey });
        let tags: string[][] = [];
        if (bookmarksEvent) {
            for (let tag of bookmarksEvent.tags) {
                if (tag[1] !== eventId) {
                    tags.push(tag);
                }
            }
        }
        await this._socialEventManagerWrite.updateUserBookmarks(tags);
    }

    async deleteEvents(eventIds: string[]) {
        await this._socialEventManagerWrite.deleteEvents(eventIds);
    }

    async fetchTrendingCommunities() {
        let communities: ITrendingCommunityInfo[] = [];
        const events = await this._socialEventManagerRead.fetchTrendingCommunities();
        let eventIdToMemberCountMap = this.getEventIdToMemberMap(events);
        const communitiesEvents = events.filter(event => event.kind === 34550);
        for (let event of communitiesEvents) {
            const communityInfo = SocialUtilsManager.extractCommunityInfo(event);
            const memberCount = eventIdToMemberCountMap[event.id] || 0;
            let community: ITrendingCommunityInfo = {
                ...communityInfo,
                memberCount
            }
            communities.push(community);
        }
        return communities;
    }

    async fetchUserEthWalletAccountsInfo(options: SocialDataManagerOptions.IFetchUserEthWalletAccountsInfo) {
        const { walletHash, pubKey } = options;
        const event = await this._socialEventManagerRead.fetchUserEthWalletAccountsInfo({ walletHash, pubKey });
        if (!event) return null;
        const content = SocialUtilsManager.parseContent(event.content);
        let accountsInfo: IEthWalletAccountsInfo = {
            masterWalletSignature: content.master_wallet_signature,
            socialWalletSignature: content.social_wallet_signature,
            encryptedKey: content.encrypted_key,
            masterWalletHash: walletHash,
            eventData: event
        }
        return accountsInfo;
    }

    async updateUserEthWalletAccountsInfo(info: IEthWalletAccountsInfo, privateKey?: string) {
        const responses = await this._socialEventManagerWrite.updateUserEthWalletAccountsInfo(info, privateKey);
        const response = responses[0];
        return response.success ? response.eventId : null;
    }

    async fetchSubCommunities(creatorId: string, communityId: string) {
        let communities: ICommunityInfo[] = [];
        try {
            const events = await this._socialEventManagerRead.fetchSubcommunites({
                communityCreatorId: creatorId,
                communityName: communityId
            });
            for (let event of events) {
                const communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                let community: ICommunity = {
                    ...communityInfo,
                    members: []
                }
                communities.push(community);
            }
        }
        catch (error) {
            console.error('fetchSubCommunities', error);
        }
        return communities;
    }

    async fetchCommunityDetailMetadata(creatorId: string, communityId: string) {
        const events = await this._socialEventManagerRead.fetchCommunityDetailMetadata({
            communityCreatorId: creatorId,
            communityName: communityId
        });

        const communityEvent = events.find(event => event.kind === 34550);
        if (!communityEvent) return null;
        const communityInfo = SocialUtilsManager.extractCommunityInfo(communityEvent);
        const statsEvent = events.find(event => event.kind === 10000105);
        let stats: ICommunityStats;
        if (statsEvent) {
            const content = SocialUtilsManager.parseContent(statsEvent.content);
            stats = {
                notesCount: content.note_count,
                membersCount: content.member_count,
                subcommunitiesCount: content.subcommunity_count,
                productsCount: content.product_count
            }
        }

        //Fetch group keys only when scpData.encryptedKey is undefined for backward compatibility
        if (communityInfo.membershipType === MembershipType.Protected && !communityInfo.scpData?.encryptedKey) {
            const keyEvents = await this._socialEventManagerRead.fetchGroupKeys({
                identifiers: [communityInfo.communityUri + ':keys']
            });
            const keyEvent = keyEvents[0];
            if (keyEvent) {
                communityInfo.memberKeyMap = JSON.parse(keyEvent.content);
            }
        }

        let detailMetadata: ICommunityDetailMetadata = {
            info: communityInfo,
            stats
        }
        
        return detailMetadata;
    }

    async updateNoteStatus(noteId: string, status: string) {
        const result = await this._socialEventManagerWrite.updateNoteStatus(noteId, status);
        return result;
    }

    async updateCommunitySubscription(options: IUpdateCommunitySubscription) {
        const communityPubkey = options.communityCreatorId.startsWith('npub1') ? Nip19.decode(options.communityCreatorId).data : options.communityCreatorId;
        const authHeader = SocialUtilsManager.constructAuthHeader(this._privateKey);
        let bodyData = {
            communityPubkey: communityPubkey,
            communityD: options.communityId,
            pubkey: this.selfPubkey,
            start: options.start,
            end: options.end,
            chainId: options.chainId,
            currency: options.currency,
            txHash: options.txHash,
            timeCreated: Math.round(Date.now() / 1000)
        };
        const relayUrl = this._publicIndexingRelay;
        let url = `${relayUrl}/update-community-subscription`;
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: authHeader
            },
            body: JSON.stringify(bodyData)
        });
        let result = await response.json();
        return result;
    }

    async fetchCommunityStalls(creatorId: string, communityId: string) {
        let stalls: ICommunityStallInfo[] = [];
        try {
            const events = await this._socialEventManagerRead.fetchCommunityStalls({
                creatorId,
                communityId
            });
            for (let event of events) {
                const communityStallInfo = SocialUtilsManager.extractCommunityStallInfo(event);
                stalls.push(communityStallInfo);
            }
        } catch (error) {
            console.error('fetchCommunityStalls', error);
        }
        return stalls;
    }

    async fetchCommunityProducts(options: SocialDataManagerOptions.IFetchCommunityProducts) {
        const { creatorId, communityId, stallId, decryptPostPurchaseContent } = options;
        let products: ICommunityProductInfo[] = [];
        try {
            const events = await this._socialEventManagerRead.fetchCommunityProducts({
                creatorId,
                communityId,
                stallId
            });
            for (let event of events) {
                const communityProductInfo = SocialUtilsManager.extractCommunityProductInfo(event);
                if (decryptPostPurchaseContent) {
                    communityProductInfo.postPurchaseContent = await this.fetchProductPostPurchaseContent({
                        sellerPubkey: communityProductInfo.eventData.pubkey,
                        productId: communityProductInfo.id,
                        postPurchaseContent: communityProductInfo.postPurchaseContent,
                        encryptedContentKey: communityProductInfo.encryptedContentKey,
                        gatekeeperPubkey: communityProductInfo.gatekeeperPubkey,
                    });
                }
                products.push(communityProductInfo);
            }
        } catch (error) {
            console.error('fetchCommunityProducts', error);
        }
        return products;
    }

    async updateCommunityStall(creatorId: string, communityId: string, stall: IMarketplaceStall) {
        if (!stall.gatekeeperPubkey) {
            const relayStatusResult = await this.checkRelayStatus(this._selfPubkey);
            if (relayStatusResult.success && relayStatusResult.npub) {
                const decodedPubkey = Nip19.decode(relayStatusResult.npub).data as string;
                stall.gatekeeperPubkey = decodedPubkey;
            }
        }
        if (stall.gatekeeperPubkey) {
            if (!stall.encryptedStallSecret) {
                const stallPrivateKey = Keys.generatePrivateKey();
                stall.stallPublicKey = Keys.getPublicKey(stallPrivateKey);
                stall.encryptedStallSecret = await SocialUtilsManager.encryptMessage(this._privateKey, stall.gatekeeperPubkey, stallPrivateKey);
            }
        }
        const result = await this._socialEventManagerWrite.updateCommunityStall(creatorId, communityId, stall);
        return result;
    }

    async updateCommunityProduct(creatorId: string, communityId: string, product: IMarketplaceProduct) {
        if (!product.gatekeeperPubkey) {
            const relayStatusResult = await this.checkRelayStatus(this._selfPubkey);
            if (relayStatusResult.success && relayStatusResult.npub) {
                const decodedPubkey = Nip19.decode(relayStatusResult.npub).data as string;
                product.gatekeeperPubkey = decodedPubkey;
            }
        }
        if (product.gatekeeperPubkey) {
            if (!product.encryptedContentKey) {
                const {
                    encryptedMessage,
                    encryptedMessageKey
                } = await this.encryptMessageWithGeneratedKey(this._privateKey, product.gatekeeperPubkey, product.postPurchaseContent);
                product.postPurchaseContent = encryptedMessage;
                product.encryptedContentKey = encryptedMessageKey;
            }
            else {
                const messagePrivateKey = await SocialUtilsManager.decryptMessage(this._privateKey, product.gatekeeperPubkey, product.encryptedContentKey);
                const messagePublicKey = Keys.getPublicKey(messagePrivateKey);
                const encryptedMessage = await SocialUtilsManager.encryptMessage(this._privateKey, messagePublicKey, product.postPurchaseContent);
                product.postPurchaseContent = encryptedMessage;
            }
        }
        const result = await this._socialEventManagerWrite.updateCommunityProduct(creatorId, communityId, product);
        return result;
    }

    async placeMarketplaceOrder(options: SocialDataManagerOptions.IPlaceMarketplaceOrder) {
        const {merchantId, stallId, stallPublicKey, order} = options;
        const result = await this._socialEventManagerWrite.placeMarketplaceOrder({
            merchantId: merchantId,
            stallId: stallId,
            stallPublicKey: stallPublicKey,
            order
        });
        return result;
    }

    async recordPaymentActivity(paymentActivity: IPaymentActivityV2) {
        const result = await this._socialEventManagerWrite.recordPaymentActivity(paymentActivity);
        return result;
    }

    async updateMarketplaceOrderStatus(merchantId: string, stallId: string, updateInfo: IMarketplaceOrderUpdateInfo) {
        const result = await this._socialEventManagerWrite.updateMarketplaceOrderStatus({
            customerId: this._selfPubkey,
            merchantId,
            stallId,
            updateInfo
        });
        return result;
    }

    async fetchPaymentActivities(options: IFetchPaymentActivitiesOptions) {    
        const paymentActivities: IPaymentActivityV2[] = [];
        const paymentActivitiesResult = await this._socialEventManagerRead.fetchPaymentActivities(options);
        const stallEvents = paymentActivitiesResult.filter(event => event.kind === 10000113);
        let stallIdToStallInfoMap: Record<string, any> = {};
        for (let event of stallEvents) {
            const content = SocialUtilsManager.parseContent(event.content);
            stallIdToStallInfoMap[content.stall_id] = content;
        }
        const paymentActivitiesEvents = paymentActivitiesResult.filter(event => event.kind === 4);
        for (let event of paymentActivitiesEvents) {
            const paymentActivity = await SocialUtilsManager.extractPaymentActivity(this._privateKey, event);
            if (!paymentActivity) continue;
            if (paymentActivity.stallId) {
                paymentActivity.stallName = stallIdToStallInfoMap[paymentActivity.stallId]?.stall_name;
            }
            paymentActivities.push(paymentActivity);
        }
        return paymentActivities;
    }

    async fetchCommunityOrders(creatorId: string, communityId: string, stallId?: string, status?: SellerOrderStatus) {
        const events = await this._socialEventManagerRead.fetchCommunityOrders({
            creatorId,
            communityId,
            stallId,
            status
        });
        const metadataEvents = events.filter(event => event.kind === 10000113);
        let orderIdToMetadataMap: Record<string, any> = {};
        for (let event of metadataEvents) {
            const content = SocialUtilsManager.parseContent(event.content);
            orderIdToMetadataMap[content.order_id] = content;
        }
        const stallEvents = events.filter(event => event.kind === 30017);
        const stallIdToStallInfoMap: Record<string, any> = {};
        for (let event of stallEvents) {
            const stallInfo = SocialUtilsManager.extractCommunityStallInfo(event);
            stallIdToStallInfoMap[stallInfo.id] = stallInfo;
        }
        const orderEvents = events.filter(event => event.kind === 4);
        const orders: IRetrievedMarketplaceOrder[] = [];
        const pubKeys: string[] = [];
        const userProfileMap: Record<string, IUserProfile> = {};
        for (let event of orderEvents) {
            const orderId = event.tags.find(tag => tag[0] === 'z')?.[1];
            const metadata = orderIdToMetadataMap[orderId];
            const stallInfo = stallIdToStallInfoMap[metadata.stall_id];
            const order = await SocialUtilsManager.extractMarketplaceOrder(this._privateKey, event, stallInfo);
            if (!order) continue;
            if (metadata) {
                order.stallId = metadata.stall_id;
                order.stallName = metadata.stall_name;
                order.orderStatus = metadata.order_status;
            }
            orders.push(order);
            if (order.contact?.nostr && !pubKeys.includes(order.contact.nostr)) {
                pubKeys.push(order.contact.nostr);
            }
        }
        if (pubKeys.length) {
            const events = await this._socialEventManagerRead.fetchUserProfileCacheEvents({ pubKeys });
            for (let event of events) {
                if (event.kind === 0) {
                    const encodedPubkey = Nip19.npubEncode(event.pubkey);
                    userProfileMap[encodedPubkey] = SocialUtilsManager.constructUserProfile({
                        ...event,
                        content: SocialUtilsManager.parseContent(event.content)
                    });
                }
            }
            for (let order of orders) {
                if (order.contact?.nostr) order.userProfile = userProfileMap[order.contact.nostr];
            }
        }
        return orders;
    }

    async fetchBuyerOrders(pubkey: string, status?: BuyerOrderStatus) {
        const events = await this._socialEventManagerRead.fetchBuyerOrders({ 
            pubkey,
            status
        });
        const metadataEvents = events.filter(event => event.kind === 10000113);
        let orderIdToMetadataMap: Record<string, any> = {};
        for (let event of metadataEvents) {
            const content = SocialUtilsManager.parseContent(event.content);
            orderIdToMetadataMap[content.order_id] = content;
        }
        const orderIdToPaymentActivityMap: Record<string, IPaymentActivityV2> = {};
        const paymentEvents = events.filter(event => event.kind === 4 && event.tags.find(tag => tag[0] === 't')?.[1] === 'payment');
        for (let event of paymentEvents) {
            const paymentActivity = await SocialUtilsManager.extractPaymentActivity(this._privateKey, event);
            if (!paymentActivity) continue;
            const orderId = paymentActivity.orderId;
            orderIdToPaymentActivityMap[orderId] = paymentActivity;
        }
        const stallEvents = events.filter(event => event.kind === 30017);
        const stallIdToStallInfoMap: Record<string, any> = {};
        for (let event of stallEvents) {
            const stallInfo = SocialUtilsManager.extractCommunityStallInfo(event);
            stallIdToStallInfoMap[stallInfo.id] = stallInfo;
        }
        const orderEvents = events.filter(event => event.kind === 4 && event.tags.find(tag => tag[0] === 't')?.[1] === 'order');
        const orders: IRetrievedBuyerOrder[] = [];
        for (let event of orderEvents) {
            const orderId = event.tags.find(tag => tag[0] === 'z')?.[1];
            const metadata = orderIdToMetadataMap[orderId];
            if (!metadata) continue;
            const stallInfo = stallIdToStallInfoMap[metadata.stall_id];
            const order = await SocialUtilsManager.extractMarketplaceOrder(this._privateKey, event, stallInfo);
            if (!order) continue;
            let buyerOrder: IRetrievedBuyerOrder = {
                ...order,
                stallId: metadata.stall_id,
                stallName: metadata.stall_name,
                status: metadata.status,
                paymentActivity: orderIdToPaymentActivityMap[order.id]
            }
            orders.push(buyerOrder);
        }
        return orders;
    }

    async fetchMarketplaceOrderDetails(orderId: string) {
        const events = await this._socialEventManagerRead.fetchMarketplaceOrderDetails({ orderId });
        if (events.length === 0) return null;
        const stallEvent = events.find(event => event.kind === 30017);
        const stallInfo = SocialUtilsManager.extractCommunityStallInfo(stallEvent);
        const orderEvent = events.find(event => event.kind === 4 && event.tags.find(tag => tag[0] === 't')?.[1] === 'order');
        const order = await SocialUtilsManager.extractMarketplaceOrder(this._privateKey, orderEvent, stallInfo);
        const paymentEvent = events.find(event => event.kind === 4 && event.tags.find(tag => tag[0] === 't')?.[1] === 'payment');
        const paymentActivity = await SocialUtilsManager.extractPaymentActivity(this._privateKey, paymentEvent);
        const metadataEvent = events.find(event => event.kind === 10000113);
        const metadata = SocialUtilsManager.parseContent(metadataEvent.content);
        let products: ICommunityProductInfo[] = await this.fetchMarketplaceProductDetails({
            stallId: metadata.stall_id,
            productIds: order.items.map(v => v.productId)
        });
        let buyerOrder: IRetrievedBuyerOrder = {
            ...order,
            stallId: metadata.stall_id,
            stallName: metadata.stall_name,
            status: metadata.status,
            paymentActivity,
            productDetails: products
        }

        return buyerOrder;
    }

    async fetchMarketplaceProductDetails(options: SocialDataManagerOptions.IFetchMarketplaceProductDetails) {
        const { stallId, productIds, decryptPostPurchaseContent } = options;
        const productEvents = await this._socialEventManagerRead.fetchMarketplaceProductDetails({
            stallId: stallId,
            productIds: productIds
        });
        let products: ICommunityProductInfo[] = [];
        for (let event of productEvents) {
            const productInfo = SocialUtilsManager.extractCommunityProductInfo(event);
            if (decryptPostPurchaseContent) {
                productInfo.postPurchaseContent = await this.fetchProductPostPurchaseContent({
                    sellerPubkey: productInfo.eventData.pubkey,
                    productId: productInfo.id,
                    postPurchaseContent: productInfo.postPurchaseContent,
                    encryptedContentKey: productInfo.encryptedContentKey,
                    gatekeeperPubkey: productInfo.gatekeeperPubkey,
                });
            }
            products.push(productInfo);
        }
        return products;
    }

    async fetchProductPostPurchaseContent(options: SocialDataManagerOptions.IFetchProductPostPurchaseContent) {
        const { sellerPubkey, productId, postPurchaseContent, gatekeeperPubkey, encryptedContentKey } = options;
        let contentKey: string;
        if (!postPurchaseContent) return '';
        if (this._selfPubkey === sellerPubkey) {
            contentKey = await SocialUtilsManager.decryptMessage(this._privateKey, gatekeeperPubkey, encryptedContentKey);
        }
        else {
            contentKey = await this._socialEventManagerRead.fetchMarketplaceProductKey({
                sellerPubkey: sellerPubkey,
                productId: productId
            })
        }
        let text;
        if (contentKey) {
            text = await SocialUtilsManager.decryptMessage(contentKey, sellerPubkey, postPurchaseContent);
        }
        return text;
    }

    async fetchProductPurchaseStatus(options: SocialDataManagerOptions.IFetchProductPurchaseStatus) {
        const { sellerPubkey, productId } = options;
        let isPurchased = await this._socialEventManagerRead.fetchProductPurchaseStatus({
            sellerPubkey: sellerPubkey,
            productId: productId
        })
        return isPurchased;
    }

    async fetchReservationsByRole(options: SocialDataManagerOptions.IFetchReservationsByRole) {
        const { role, since, until } = options;
        const data = await this._socialEventManagerRead.fetchReservationsByRole({
            role,
            since,
            until
        });
        return data;
    }

    async fetchRegions() {
        return this.systemDataManager.fetchRegions();
    }

    async fetchCurrencies() {
        return this.systemDataManager.fetchCurrencies();
    }

    async fetchCryptocurrencies() {
        return this.systemDataManager.fetchCryptocurrencies();
    }
}

export {
    SocialDataManager
}