import { Nip19, Event, Keys } from "../core/index";
import { IChannelInfo, ICommunityBasicInfo, ICommunityInfo, IFetchNotesOptions, INostrEvent, IPaymentActivity,  ISocialEventManagerRead, SocialEventManagerReadOptions} from "../utils/interfaces";
import { INostrCommunicationManager, INostrRestAPIManager } from "./communication";
import { SocialUtilsManager } from "./utilsManager";

class NostrEventManagerRead implements ISocialEventManagerRead {
    protected _nostrCommunicationManager: INostrCommunicationManager;
    protected _privateKey: string;

    constructor(manager: INostrCommunicationManager) {
        this._nostrCommunicationManager = manager;
    }

    set nostrCommunicationManager(manager: INostrCommunicationManager) {
        this._nostrCommunicationManager = manager;
    }

    set privateKey(privateKey: string) {
        this._privateKey = privateKey;
    }

    async fetchThreadCacheEvents(options: SocialEventManagerReadOptions.IFetchThreadCacheEvents) {
        const {id, pubKey} = options;
        let decodedId = id.startsWith('note1') ? Nip19.decode(id).data : id;
        let msg: any = {
            event_id: decodedId,
            limit: 100
        };
        if (pubKey) {
            const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
            msg.user_pubkey = decodedPubKey;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('thread_view', msg);
        return fetchEventsResponse.events;
    }

    async fetchTrendingCacheEvents(options: SocialEventManagerReadOptions.IFetchTrendingCacheEvents) {
        const {pubKey} = options;
        let msg: any = {
        };
        if (pubKey) {
            const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
            msg.user_pubkey = decodedPubKey;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('explore_global_trending_24h', msg);
        return fetchEventsResponse.events;
    }

    async fetchProfileFeedCacheEvents(options: SocialEventManagerReadOptions.IFetchProfileFeedCacheEvents) {
        let {pubKey, since, until, userPubkey} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            limit: 20,
            notes: "authored",
            pubkey: decodedPubKey
        };
        if (until === 0) {
            msg.since = since;
        }
        else {
            msg.until = until;
        }
        if (userPubkey) {
            const decodedUserPubKey = userPubkey.startsWith('npub1') ? Nip19.decode(userPubkey).data : userPubkey;
            msg.user_pubkey = decodedUserPubKey;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('feed', msg);
        return fetchEventsResponse.events;
    }

    async fetchProfileRepliesCacheEvents(options: SocialEventManagerReadOptions.IFetchProfileRepliesCacheEvents) {  
        let {pubKey, since, until, userPubkey} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            limit: 20,
            notes: "replies",
            pubkey: decodedPubKey
        };
        if (until === 0) {
            msg.since = since;
        }
        else {
            msg.until = until;
        }
        if (userPubkey) {
            const decodedUserPubKey = userPubkey.startsWith('npub1') ? Nip19.decode(userPubkey).data : userPubkey;
            msg.user_pubkey = decodedUserPubKey;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('feed', msg);
        return fetchEventsResponse.events;
    }

    async fetchHomeFeedCacheEvents(options: SocialEventManagerReadOptions.IFetchHomeFeedCacheEvents) {
        let {since, until, pubKey} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        let msg: any = {
            limit: 20
        };
        if (until === 0) {
            msg.since = since;
        }
        else {
            msg.until = until;
        }
        msg.pubkey = Nip19.decode('npub1nfgqmnxqsjsnsvc2r5djhcx4ap3egcjryhf9ppxnajskfel2dx9qq6mnsp').data //FIXME: Account to show Nostr highlights 
        if (pubKey) {
            const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
            msg.user_pubkey = decodedPubKey;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('feed', msg);
        return fetchEventsResponse.events;
    }

    async fetchUserProfileCacheEvents(options: SocialEventManagerReadOptions.IFetchUserProfileCacheEvents) {
        const {pubKeys} = options;
        const decodedPubKeys = pubKeys.map(pubKey => pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey);
        let msg: any = {
            pubkeys: decodedPubKeys
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('user_infos', msg);
        return fetchEventsResponse.events;
    }

    async fetchUserProfileDetailCacheEvents(options: SocialEventManagerReadOptions.IFetchUserProfileDetailCacheEvents) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            pubkey: decodedPubKey,
            user_pubkey: decodedPubKey
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('user_profile', msg);
        return fetchEventsResponse.events;
    }

    async fetchContactListCacheEvents(options: SocialEventManagerReadOptions.IFetchContactListCacheEvents) {
        const {pubKey, detailIncluded} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            extended_response: detailIncluded,
            pubkey: decodedPubKey
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('contact_list', msg);
        return fetchEventsResponse.events;
    }    

    async fetchUserRelays(options: SocialEventManagerReadOptions.IFetchUserRelays) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            pubkey: decodedPubKey
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('get_user_relays', msg);
        return fetchEventsResponse.events;
    }

    async fetchFollowersCacheEvents(options: SocialEventManagerReadOptions.IFetchFollowersCacheEvents) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            pubkey: decodedPubKey
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('user_followers', msg);
        return fetchEventsResponse.events;
    }  

    async fetchCommunities(options: SocialEventManagerReadOptions.IFetchCommunities) {
        const {pubkeyToCommunityIdsMap} = options;
        let events;
        if (pubkeyToCommunityIdsMap && Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            let requests: any[] = [];
            for (let pubkey in pubkeyToCommunityIdsMap) {
                const decodedPubKey = pubkey.startsWith('npub1') ? Nip19.decode(pubkey).data : pubkey;
                const communityIds = pubkeyToCommunityIdsMap[pubkey];
                let request: any = {
                    kinds: [34550],
                    authors: [decodedPubKey],
                    "#d": communityIds
                };
                requests.push(request);
            }
            const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(...requests);
            events = fetchEventsResponse.events;
        }   
        else {
            let request: any = {
                kinds: [34550],
                limit: 50
            };
            const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
            events = fetchEventsResponse.events;
        }
        return events;
    }

    async fetchAllUserRelatedCommunities(options: SocialEventManagerReadOptions.IFetchAllUserRelatedCommunities) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let requestForCreatedCommunities: any = {
            kinds: [34550],
            authors: [decodedPubKey]
        };
        let requestForFollowedCommunities: any = {
            kinds: [30001],
            "#d": ["communities"],
            authors: [decodedPubKey]
        }
        let requestForModeratedCommunities: any = {
            kinds: [34550],
            "#p": [decodedPubKey]
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(
            requestForCreatedCommunities, 
            requestForFollowedCommunities,
            requestForModeratedCommunities
        );
        let communitiesEvents: INostrEvent[] = [];
        const pubkeyToCommunityIdsMap: Record<string, string[]> = {};
        for (let event of fetchEventsResponse.events) {
            if (event.kind === 34550) {
                communitiesEvents.push(event);
            }
            else if (event.kind === 30001) {
                const bookmarkedCommunities = SocialUtilsManager.extractBookmarkedCommunities(event);
                for (let community of bookmarkedCommunities) {
                    const pubkey = community.creatorId;
                    const communityId = community.communityId;
                    if (!pubkeyToCommunityIdsMap[pubkey]) {
                        pubkeyToCommunityIdsMap[pubkey] = [];
                    }
                    pubkeyToCommunityIdsMap[pubkey].push(communityId);
                }
            }
        }
        if (Object.keys(pubkeyToCommunityIdsMap).length > 0) {
            const bookmarkedCommunitiesEvents = await this.fetchCommunities({pubkeyToCommunityIdsMap});
            for (let event of bookmarkedCommunitiesEvents) {
                communitiesEvents.push(event);
            }
        }
        return communitiesEvents;
    }

    async fetchAllUserRelatedCommunitiesFeed(options: SocialEventManagerReadOptions.IFetchAllUserRelatedCommunitiesFeed) {
        const communitiesEvents = await this.fetchAllUserRelatedCommunities(options);
        let communityUriArr: string[] = [];
        let identifiers: string[] = [];
        for (let event of communitiesEvents) {
            if (event.kind === 34550) {
                const communityInfo = SocialUtilsManager.extractCommunityInfo(event);
                identifiers.push(communityInfo.communityUri + ':keys');
                communityUriArr.push(communityInfo.communityUri);
            }
        }
        let feedEvents: INostrEvent[] = [];
        if (communityUriArr.length > 0) {
            feedEvents = await this.fetchCommunitiesFeed({ communityUriArr });
        }
        return feedEvents;
    }

    async fetchUserBookmarkedCommunities(options: SocialEventManagerReadOptions.IFetchUserBookmarkedCommunities) {
        const {pubKey, excludedCommunity} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let request: any = {
            kinds: [30001],
            "#d": ["communities"],
            authors: [decodedPubKey]
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        const bookmarkedCommunitiesEvent = fetchEventsResponse.events.find(event => event.kind === 30001);
        const communities: ICommunityBasicInfo[] = SocialUtilsManager.extractBookmarkedCommunities(bookmarkedCommunitiesEvent, excludedCommunity);
        return communities;
    }

    async fetchCommunity(options: SocialEventManagerReadOptions.IFetchCommunity) {
        const {communityId, creatorId} = options;
        const decodedCreatorId = creatorId.startsWith('npub1') ? Nip19.decode(creatorId).data : creatorId;
        let infoMsg: any = {
            kinds: [34550],
            authors: [decodedCreatorId],
            "#d": [communityId]
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(infoMsg);
        return fetchEventsResponse.events;        
    }

    async fetchCommunitiesMetadataFeed(options: SocialEventManagerReadOptions.IFetchCommunitiesMetadataFeed) {
        const {communities} = options;
        let requests: any[] = [];
        for (let community of communities) {
            const decodedCreatorId = community.creatorId.startsWith('npub1') ? Nip19.decode(community.creatorId).data : community.creatorId;
            const communityUri = SocialUtilsManager.getCommunityUri(community.creatorId, community.communityId);
            let infoMsg: any = {
                kinds: [34550],
                authors: [decodedCreatorId],
                "#d": [community.communityId]
            };
            let notesMsg: any = {
                kinds: [1],
                "#a": [communityUri],
                limit: 20
            };
            requests.push(infoMsg);
            requests.push(notesMsg);
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(...requests);
        return fetchEventsResponse.events;        
    }

    async fetchCommunityFeed(options: SocialEventManagerReadOptions.IFetchCommunityFeed) {
        const {communityUri, since, until} = options;
        let request: any = {
            kinds: [1],
            "#a": [communityUri],
            limit: 20
        }
        if (since != null) {
            request.since = since;
        }
        if (until != null) {
            request.until = until;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events;
    }

    async fetchCommunitiesFeed(options: SocialEventManagerReadOptions.IFetchCommunitiesFeed) {
        const {communityUriArr} = options;
        let request: any = {
            kinds: [1],
            "#a": communityUriArr,
            limit: 50
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events;
    }

    async fetchCommunitiesGeneralMembers(options: SocialEventManagerReadOptions.IFetchCommunitiesGeneralMembers) {
        const {communities} = options;
        const communityUriArr: string[] = [];
        for (let community of communities) {
            const communityUri = SocialUtilsManager.getCommunityUri(community.creatorId, community.communityId);
            communityUriArr.push(communityUri);
        }
        let request: any = {
            kinds: [30001],
            "#d": ["communities"],
            "#a": communityUriArr
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events;        
    }

    async fetchNotes(options: IFetchNotesOptions) {
        const decodedNpubs = options.authors?.map(npub => Nip19.decode(npub).data);
        let decodedIds = options.ids?.map(id => id.startsWith('note1') ? Nip19.decode(id).data : id);
        let msg: any = {
            kinds: [1],
            limit: 20
        };
        if (decodedNpubs) msg.authors = decodedNpubs;
        if (decodedIds) msg.ids = decodedIds;
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(msg);
        return fetchEventsResponse.events;
    }

    // async fetchMetadata(options: IFetchMetadataOptions) {
    //     let decodedNpubs;
    //     if (options.decodedAuthors) {
    //         decodedNpubs = options.decodedAuthors;
    //     }
    //     else {
    //         decodedNpubs = options.authors?.map(npub => Nip19.decode(npub).data) || [];
    //     }
    //     const msg = {
    //         authors: decodedNpubs,
    //         kinds: [0]
    //     };
    //     const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(msg);
    //     return fetchEventsResponse.events;
    // }

    // async fetchReplies(options: IFetchRepliesOptions) {
    //     let decodedNoteIds;
    //     if (options.decodedIds) {
    //         decodedNoteIds = options.decodedIds;
    //     }
    //     else {
    //         decodedNoteIds = options.noteIds?.map(id => id.startsWith('note1') ? Nip19.decode(id).data : id);
    //     }
    //     const msg = {
    //         "#e": decodedNoteIds,
    //         kinds: [1],
    //         limit: 20,
    //     }
    //     const events = await this._nostrCommunicationManager.fetchEvents(msg);
    //     return events;
    // }

    // async fetchFollowing(npubs: string[]) {
    //     const decodedNpubs = npubs.map(npub => Nip19.decode(npub).data);
    //     const msg = {
    //         authors: decodedNpubs,
    //         kinds: [3]
    //     }
    //     const events = await this._nostrCommunicationManager.fetchEvents(msg);
    //     return events;
    // }

    async fetchAllUserRelatedChannels(options: SocialEventManagerReadOptions.IFetchAllUserRelatedChannels) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let requestForCreatedChannels: any = {
            kinds: [40, 41],
            authors: [decodedPubKey]
        };
        let requestForJoinedChannels: any = {
            kinds: [30001],
            "#d": ["channels"],
            authors: [decodedPubKey]
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(
            requestForCreatedChannels, 
            requestForJoinedChannels
        );

        let channels: IChannelInfo[] = [];
        let bookmarkedChannelEventIds: string[] = [];
        const channelMetadataMap: Record<string, IChannelInfo> = {};
        const handleChannelEvent = (event: INostrEvent) => {
            if (event.kind === 40) {
                const channelInfo = SocialUtilsManager.extractChannelInfo(event);
                if (channelInfo) {
                    channels.push(channelInfo);
                }
            }
            else if (event.kind === 41) {
                const channelInfo = SocialUtilsManager.extractChannelInfo(event);
                if (channelInfo) {
                    channelMetadataMap[channelInfo.id] = channelInfo;
                }
            }
        };

        for (let event of fetchEventsResponse.events) {
            if (event.kind === 30001) {
                bookmarkedChannelEventIds = SocialUtilsManager.extractBookmarkedChannels(event);
            }
            else {
                handleChannelEvent(event);
            }
        }

        if (bookmarkedChannelEventIds.length > 0) {
            const bookmarkedChannelEvents = await this.fetchEventsByIds({
                ids: bookmarkedChannelEventIds
            });
            for (let event of bookmarkedChannelEvents) {
                handleChannelEvent(event);
            }
        }

        const pubkeyToCommunityIdsMap: Record<string, string[]> = {};
        for (let channel of channels) {
            const scpData = channel.scpData;
            if (!scpData?.communityUri) continue;
            const {communityId} = SocialUtilsManager.getCommunityBasicInfoFromUri(scpData.communityUri);
            pubkeyToCommunityIdsMap[channel.eventData.pubkey] = pubkeyToCommunityIdsMap[channel.eventData.pubkey] || [];
            if (!pubkeyToCommunityIdsMap[channel.eventData.pubkey].includes(communityId)) {
                pubkeyToCommunityIdsMap[channel.eventData.pubkey].push(communityId);
            }
        }

        let channelIdToCommunityMap: Record<string, ICommunityInfo> = {};
        const communityEvents = await this.fetchCommunities(pubkeyToCommunityIdsMap);
        for (let event of communityEvents) {
            const communityInfo = SocialUtilsManager.extractCommunityInfo(event);
            const channelId = communityInfo.scpData?.channelEventId;
            if (!channelId) continue;
            channelIdToCommunityMap[channelId] = communityInfo;
        }
        return {
            channels,
            channelMetadataMap,
            channelIdToCommunityMap
        }
    }

    async fetchUserBookmarkedChannelEventIds(options: SocialEventManagerReadOptions.IFetchUserBookmarkedChannelEventIds) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let requestForJoinedChannels: any = {
            kinds: [30001],
            "#d": ["channels"],
            authors: [decodedPubKey]
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(requestForJoinedChannels);
        const bookmarkedChannelsEvent = fetchEventsResponse.events.find(event => event.kind === 30001);
        const channelEventIds = SocialUtilsManager.extractBookmarkedChannels(bookmarkedChannelsEvent);

        return channelEventIds;
    }

    async fetchEventsByIds(options: SocialEventManagerReadOptions.IFetchEventsByIds) {
        const {ids} = options;
        let request: any = {
            ids: ids
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events;
    }

    async fetchChannelMessages(options: SocialEventManagerReadOptions.IFetchChannelMessages) {
        let {channelId, since, until} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        const decodedChannelId = channelId.startsWith('npub1') ? Nip19.decode(channelId).data : channelId;
        let messagesReq: any = {
            kinds: [42],
            "#e": [decodedChannelId],
            limit: 20
        };
        if (until === 0) {
            messagesReq.since = since;
        }
        else {
            messagesReq.until = until;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(
            messagesReq
        );
        return fetchEventsResponse.events;        
    }

    async fetchChannelInfoMessages(options: SocialEventManagerReadOptions.IFetchChannelInfoMessages) {
        const {channelId} = options;
        const decodedChannelId = channelId.startsWith('npub1') ? Nip19.decode(channelId).data : channelId;
        let channelCreationEventReq: any = {
            kinds: [40],
            ids: [decodedChannelId],
        };
        let channelMetadataEventReq: any = {
            kinds: [41],
            "#e": [decodedChannelId]
        };
        let messagesReq: any = {
            kinds: [42],
            "#e": [decodedChannelId],
            limit: 20
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(
            channelCreationEventReq, 
            channelMetadataEventReq,
            messagesReq
        );
        return fetchEventsResponse.events;        
    }

    async fetchMessageContactsCacheEvents(options: SocialEventManagerReadOptions.IFetchMessageContactsCacheEvents) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            user_pubkey: decodedPubKey,
            relation: 'follows'
        };
        const followsEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('get_directmsg_contacts', msg);
        msg = {
            user_pubkey: decodedPubKey,
            relation: 'other'
        };
        const otherEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('get_directmsg_contacts', msg);
        return [...followsEventsResponse.events, ...otherEventsResponse.events];
    }

    async fetchDirectMessages(options: SocialEventManagerReadOptions.IFetchDirectMessages) {
        let {pubKey, sender, since, until} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        const decodedSenderPubKey = sender.startsWith('npub1') ? Nip19.decode(sender).data : sender;
        const req: any = {
            receiver: decodedPubKey,
            sender: decodedSenderPubKey,
            limit: 20
        }
        if (until === 0) {
            req.since = since;
        }
        else {
            req.until = until;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('get_directmsgs', req);
        return fetchEventsResponse.events;
    }

    async resetMessageCount(options: SocialEventManagerReadOptions.IResetMessageCount) {
        const {pubKey, sender} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data as string : pubKey;
        const decodedSenderPubKey = sender.startsWith('npub1') ? Nip19.decode(sender).data : sender;
        const createAt = Math.ceil(Date.now() / 1000);
        let event: any = {
            "content": JSON.stringify({ "description": `reset messages from '${decodedSenderPubKey}'`}),
            "kind": 30078,
            "tags": [
                [
                    "d",
                    "Scom Social"
                ]
            ],
            "created_at": createAt,
            "pubkey": decodedPubKey
        };
        event.id = Event.getEventHash(event);
        event.sig = Event.getSignature(event, this._privateKey);
        const msg: any = {
            event_from_user: event,
            sender: decodedSenderPubKey
        };
        await this._nostrCommunicationManager.fetchCachedEvents('reset_directmsg_count', msg);
    }

    async fetchGroupKeys(options: SocialEventManagerReadOptions.IFetchGroupKeys) {
        const {identifiers} = options;
        let req: any = {
            kinds: [30078],
            "#d": identifiers
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
        return fetchEventsResponse.events || [];
    }

    async fetchUserGroupInvitations(options: SocialEventManagerReadOptions.IFetchUserGroupInvitations) {
        const {pubKey, groupKinds} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data as string : pubKey;
        let req: any = {
            kinds: [30078],
            "#p": [decodedPubKey],
            "#k": groupKinds.map(kind => kind.toString())
        };
        const fetchEventsResponse =  await this._nostrCommunicationManager.fetchEvents(req);
        let events = fetchEventsResponse.events?.filter(event => event.tags.filter(tag => tag[0] === 'p' && tag?.[3] === 'invitee').map(tag => tag[1]).includes(decodedPubKey));
        return events;
    }

    async fetchCalendarEvents(options: SocialEventManagerReadOptions.IFetchCalendarEvents) {
        const {limit} = options;
        let req = {
            kinds: [31922, 31923],
            limit: limit || 10
        }; 
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
        return {
            events: fetchEventsResponse.events,
            data: fetchEventsResponse.data
        }
    }

    async fetchCalendarEvent(options: SocialEventManagerReadOptions.IFetchCalendarEvent) {
        const {address} = options;
        let req: any = {
            kinds: [address.kind],
            "#d": [address.identifier],
            authors: [address.pubkey]
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
        return fetchEventsResponse.events?.length > 0 ? fetchEventsResponse.events[0] : null;
    }

    async fetchCalendarEventPosts(options: SocialEventManagerReadOptions.IFetchCalendarEventPosts) {
        const {calendarEventUri} = options;
        let request: any = {
            kinds: [1],
            "#a": [calendarEventUri],
            limit: 50
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events;        
    }

    async fetchCalendarEventRSVPs(options: SocialEventManagerReadOptions.IFetchCalendarEventRSVPs) {
        const {calendarEventUri, pubkey} = options;
        let req: any = {
            kinds: [31925],
            "#a": [calendarEventUri]
        };
        if (pubkey) {
            const decodedPubKey = pubkey.startsWith('npub1') ? Nip19.decode(pubkey).data : pubkey;
            req.authors = [decodedPubKey];
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
        return fetchEventsResponse.events;
    }

    async fetchLongFormContentEvents(options: SocialEventManagerReadOptions.IFetchLongFormContentEvents) {
        let {pubKey, since, until} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        let req: any = {
            kinds: [30023],
            limit: 20
        };
        if (pubKey) {
            const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
            req.authors = [decodedPubKey];
        }
        if (until === 0) {
            req.since = since;
        }
        else {
            req.until = until;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
        return fetchEventsResponse.events;
    }

    // async fetchLikes(eventId: string) {
    //     let req: any = {
    //         kinds: [7],
    //         "#e": [eventId]
    //     };
    //     const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
    //     return fetchEventsResponse.events;
    // }

    async searchUsers(options: SocialEventManagerReadOptions.ISearchUsers) {
        const {query} = options;
        const req: any = {
            query: query,
            limit: 10
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('user_search', req);
        return fetchEventsResponse.events;
    }

    async fetchPaymentRequestEvent(options: SocialEventManagerReadOptions.IFetchPaymentRequestEvent) {
        const {paymentRequest} = options;
        let hash = Event.getPaymentRequestHash(paymentRequest);
        let req: any = {
            kinds: [9739],
            "#r": [hash]
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
        return fetchEventsResponse.events?.length > 0 ? fetchEventsResponse.events[0] : null;
    }
    
    async fetchPaymentReceiptEvent(options: SocialEventManagerReadOptions.IFetchPaymentReceiptEvent) {
        const {requestEventId} = options;
        let req: any = {
            kinds: [9740],
            "#e": [requestEventId]
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(req);
        return fetchEventsResponse.events?.length > 0 ? fetchEventsResponse.events[0] : null;
    }
    
    private getPaymentHash(tags: string[][]) {
        let tagsMap: Record<string, string[]> = {};
        for (let _t of tags) {
            tagsMap[_t[0]] = _t.slice(1);
        }
        return tagsMap['bolt11']?.[0] || tagsMap['payreq']?.[0] || tagsMap['r']?.[0];
    }

    async fetchPaymentActivitiesForRecipient(options: SocialEventManagerReadOptions.IFetchPaymentActivitiesForRecipient) {
        let {pubkey, since, until} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        let paymentRequestEventsReq: any = {
            kinds: [9739],
            authors: [pubkey],
            limit: 10
        };
        if (until === 0) {
            paymentRequestEventsReq.since = since;
        }
        else {
            paymentRequestEventsReq.until = until;
        }
        const paymentRequestEvents = await this._nostrCommunicationManager.fetchEvents(paymentRequestEventsReq);
        const requestEventIds = paymentRequestEvents.events.map(event => event.id);
        let paymentReceiptEventsReq: any = {
            kinds: [9740],
            "#e": requestEventIds
        };
        const paymentReceiptEvents = await this._nostrCommunicationManager.fetchEvents(paymentReceiptEventsReq);
        let paymentActivity: IPaymentActivity[] = [];
        for (let requestEvent of paymentRequestEvents.events) {
            const paymentHash = this.getPaymentHash(requestEvent.tags);
            const amount = requestEvent.tags.find(tag => tag[0] === 'amount')?.[1];
            const receiptEvent = paymentReceiptEvents.events.find(event => event.tags.find(tag => tag[0] === 'e')?.[1] === requestEvent.id);
            let status = 'pending';
            let sender: string;
            if (receiptEvent) {
                status = 'completed';
                sender = receiptEvent.pubkey;
            }
            paymentActivity.push({
                paymentHash,
                sender,
                recipient: pubkey,
                amount,
                status,
                createdAt: requestEvent.created_at
            });
        }
        return paymentActivity;
    }

    async fetchPaymentActivitiesForSender(options: SocialEventManagerReadOptions.IFetchPaymentActivitiesForSender) {
        let {pubkey, since, until} = options;
        if (!since) since = 0;
        if (!until) until = 0;
        let paymentReceiptEventsReq: any = {
            kinds: [9740],
            authors: [pubkey],
            limit: 10
        };
        if (until === 0) {
            paymentReceiptEventsReq.since = since;
        }
        else {
            paymentReceiptEventsReq.until = until;
        }
        const paymentReceiptEvents = await this._nostrCommunicationManager.fetchEvents(paymentReceiptEventsReq);
        let requestEventIds: string[] = [];
        for (let event of paymentReceiptEvents.events) {
            const requestEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
            if (requestEventId) {
                requestEventIds.push(requestEventId);
            }
        }
        let paymentRequestEventsReq: any = {
            kinds: [9739],
            ids: requestEventIds
        };
        const paymentRequestEvents = await this._nostrCommunicationManager.fetchEvents(paymentRequestEventsReq);
        let paymentActivity: IPaymentActivity[] = [];
        for (let receiptEvent of paymentReceiptEvents.events) {
            const requestEventId = receiptEvent.tags.find(tag => tag[0] === 'e')?.[1];
            const requestEvent = paymentRequestEvents.events.find(event => event.id === requestEventId);
            if (requestEvent) {
                const paymentHash = this.getPaymentHash(requestEvent.tags);
                const amount = requestEvent.tags.find(tag => tag[0] === 'amount')?.[1];
                paymentActivity.push({
                    paymentHash,
                    sender: pubkey,
                    recipient: requestEvent.pubkey,
                    amount,
                    status: 'completed',
                    createdAt: receiptEvent.created_at
                });
            }
        }
        return paymentActivity;
    }

    async fetchUserFollowingFeed(options: SocialEventManagerReadOptions.IFetchUserFollowingFeed) {
        let {pubKey, until} = options;
        if (!until) until = 0;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let msg: any = {
            user_pubkey: decodedPubKey,
            timeframe: 'latest',
            scope: 'follows',
            limit: 20
        };
        if (until > 0) {
            msg.until = until;
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchCachedEvents('explore', msg);
        return fetchEventsResponse.events;
    }

    async fetchCommunityPinnedNotesEvent(options: SocialEventManagerReadOptions.IFetchCommunityPinnedNotesEvent) {
        const {creatorId, communityId} = options;
        const communityUri = SocialUtilsManager.getCommunityUri(creatorId, communityId);
        let request: any = {
            kinds: [9741],
            "#a": [communityUri]
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events?.length > 0 ? fetchEventsResponse.events[0] : null;
    }
    
    async fetchCommunityPinnedNoteIds(options: SocialEventManagerReadOptions.IFetchCommunityPinnedNoteIds) {
        const event = await this.fetchCommunityPinnedNotesEvent(options);
        let noteIds: string[] = [];
        if (event) {
            for (let tag of event.tags) {
                if (tag[0] === 'e') {
                    noteIds.push(tag[1]);
                }
            }
        }
        return noteIds;
    }
    
    async fetchUserPinnedNotes(options: SocialEventManagerReadOptions.IFetchUserPinnedNotes) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let request: any = {
            kinds: [10001],
            authors: [decodedPubKey]
        };
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events?.length > 0 ? fetchEventsResponse.events[0] : null;
    }

    async fetchUserBookmarks(options: SocialEventManagerReadOptions.IFetchUserBookmarks) {
        const {pubKey} = options;
        const decodedPubKey = pubKey.startsWith('npub1') ? Nip19.decode(pubKey).data : pubKey;
        let request: any = {
            kinds: [10003],
            authors: [decodedPubKey]
        }
        const fetchEventsResponse = await this._nostrCommunicationManager.fetchEvents(request);
        return fetchEventsResponse.events?.length > 0 ? fetchEventsResponse.events[0] : null;
    }
    
    async fetchTrendingCommunities() {
        const pubkeyToCommunityIdsMap: Record<string, string[]> = {
            "npub1rjc54ve4sahunm7r0kpchg58eut7ttwvevst7m2fl8dfd9w4y33q0w0qw2": ["Photography"],
            "npub1c6dhrhzkflwr2zkdmlujnujawgp2c9rsep6gscyt6mvcusnt5a3srnzmx3": ["Vegan_Consciousness"]
        };
        const events = this.fetchCommunities({
            pubkeyToCommunityIdsMap
        });
        return events || [];
    }
}

export {
    NostrEventManagerRead,
    ISocialEventManagerRead
}