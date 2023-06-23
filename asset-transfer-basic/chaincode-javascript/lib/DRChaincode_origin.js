/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class DRChaincode extends Contract {
    //set initial value to variables
    async Init_Ledger(ctx) {
        const proposals =[
            {
                ID: 'proposal4',
                URI: 'http://localhost:3006/v1',
                Domain: 'manufacturing',
                Valid: '1',
                AuthorID: 'member1',
                Proposal_Message: 'Add a new use case in the ontology Manufacture, the use case called Danobat',
                Creation_Date: '20201023',
                State: 'ongoing',
                Type: 'newProposal',
                OriginalID: '',
                NumAcceptedVotes: 0,
                NumRejectedVotes: 0,
                AcceptedVotes: [],
                RejectedVotes: [],
                Hash: 'https://ipfs.io/ipfs/QmSWDa85q8FQzB8qAnuoxZ4LDoXoWKmD6t4sPszdq5FiW2?filename=test.owl',
            },
            {
                ID: 'proposal5',
                URI: 'http://localhost:3006/v2',
                Domain: 'manufacturing',
                Valid: '2',
                AuthorID: 'member2',
                Proposal_Message: 'Add a new use case 2',
                Creation_Date: '20201030',
                State: 'open',
                Type: 'vetoProposal',
                OriginalID: 'http://localhost:3006/v1',
                NumAcceptedVotes: 0,
                NumRejectedVotes: 0,
                AcceptedVotes: [],
                RejectedVotes: [],
                Hash: '',
            },
        ];
        for(const proposal of proposals){
            proposal.docType = 'proposal';
            await ctx.stub.putState(proposal.ID, Buffer.from(JSON.stringify(proposal)));
            let indexName = 'proposal-order';
            let ProposalOrderKey = ctx.stub.createCompositeKey(indexName, [proposal.Valid, proposal.ID]);
            await ctx.stub.putState(ProposalOrderKey, null);
            console.info(`Proposal ${proposal.ID} initialized`);
        }
        //time is used for the count-down of the ongoing proposal
        //Every time we check whether (current time - time) < (valid time for each proposal),
        // if no the current ongoing proposal will be closed
        const time = Date();
        await ctx.stub.putState('time', Buffer.from(JSON.stringify(time)));
        //A closed proposal will be stored in this object. Its ID will change from 'proposalX' to 'closedproposalX'
        const closedProposals = [
            {
                ID: 'closedproposal1',
                State: 'accepted',
                EndDate: Date(),
                Veto: false
            },
            {
                ID: 'closedproposal2',
                State: 'rejected',
                EndDate: Date(),
                Veto: false
            },
            {
                ID: 'closedproposal3',
                State: 'empty',
                EndDate: Date(),
                Veto: false
            }
        ];
        for(const closedProposal of closedProposals){
            closedProposal.docType = 'closedProposal';
            await ctx.stub.putState(closedProposal.ID, Buffer.from(JSON.stringify(closedProposal)));
            console.info(`AcceptedProposal ${closedProposal.ID} initialized`);
        }
        const members = [
            {
                ID: 'member1',
                Name: 'Luo',
                Email: 'luo@gmail.com',
                Role: 'Expert',
                Domain: 'Manufacturing',
                Tokens: 200,
                Total_Proposal: 0,
                Total_Accepted_Proposal: 0,
                LastParticipation: 'Sun May 1 2022 01:00:00 GMT+0000 (Coordinated Universal Time)'
            },
            {
                ID: 'member2',
                Name: 'Benat',
                Email: 'benat@gmail.com',
                Role: 'Lobe_Owner',
                Domain: 'Manufacturing',
                Tokens: 100,
                Total_Proposal: 0,
                Total_Accepted_Proposal: 0,
                LastParticipation: 'Thu Apr 1 2021 01:00:00 GMT+0000 (Coordinated Universal Time)'
            },
            {
                ID: 'member3',
                Name: 'Xabi',
                Email: 'xabi@gmail.com',
                Role: 'Expert',
                Domain: 'Manufacturing',
                Tokens: 1000,
                Total_Proposal: 0,
                Total_Accepted_Proposal: 0,
                LastParticipation: 'Tue Mar 1 2022 01:00:00 GMT+0000 (Coordinated Universal Time)'
            },
            {
                ID: 'member4',
                Name: 'Ilir',
                Email: 'ilir@gmail.com',
                Role: 'Expert',
                Domain: 'Manufacturing',
                Tokens: 200,
                Total_Proposal: 0,
                Total_Accepted_Proposal: 0,
                LastParticipation: 'Sun May 1 2021 01:00:00 GMT+0000 (Coordinated Universal Time)'
            },
            {
                ID: 'member5',
                Name: 'Imanol',
                Email: 'imanol@gmail.com',
                Role: 'Expert',
                Domain: 'Manufacturing',
                Tokens: 600,
                Total_Proposal: 0,
                Total_Accepted_Proposal: 0,
                LastParticipation: 'Wed Dec 1 2021 01:00:00 GMT+0000 (Coordinated Universal Time)'
            },
        ];
        await ctx.stub.putState('members', Buffer.from(JSON.stringify(members)));
        //record the current lobe owner in a lobe
        const domainLobeOwners = [
            {
                ID: 'Manufacturing',
                LobeOwner: 'member2'
            }
        ];
        domainLobeOwners.docType = 'domains';
        await ctx.stub.putState('domains', Buffer.from(JSON.stringify(domainLobeOwners)));
        console.info(`Member ${domainLobeOwners} initialized`);
        const total_members = members.length ;
        await ctx.stub.putState('total_members', Buffer.from(JSON.stringify(total_members)));
        const total_proposals = proposals.length + closedProposals.length;
        await ctx.stub.putState('total_proposals', Buffer.from(JSON.stringify(total_proposals)));
        const ongoingProposal = 4;
        await ctx.stub.putState('ongoingProposal', Buffer.from(JSON.stringify(ongoingProposal)));
        const latestDR = 'http://localhost:3006/v0';
        await ctx.stub.putState('latestDR', Buffer.from(JSON.stringify(latestDR)));
        const fileHash = 'https://ipfs.io/ipfs/QmSWDa85q8FQzB8qAnuoxZ4LDoXoWKmD6t4sPszdq5FiW2?filename=test.owl';
        await ctx.stub.putState('fileHash', Buffer.from(JSON.stringify(fileHash)));

        console.log('*******************DRChaincode*******************');
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllData(ctx) {
        const allResults = [];
        // This is for a test, to see all the data in the world state.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async CheckTotalProposals(ctx){
        const total_roposal = await ctx.stub.getState('total_proposals');
        console.log(total_roposal + 'is read');
        return total_roposal.toString();
    }

    //return tokens of user with 'id', to dashboard
    async CheckTokens(ctx, id) {
        //Get the tokens member with the "id" has
        console.log('memberId'+id);        
        let members = await this.GetMembers(ctx);
        let member = members.find(member => member.ID == id);
        if(member === undefined) return -1;
        else return member.Tokens;
    }

    //return amount of total members to the dashboard
    async CheckTotalMembers(ctx){
        //Get the amount of all members. It is shown on dashboard.
        const totalMembers = await ctx.stub.getState('total_members');
        return totalMembers.toString();
    }

    //return the latest DR
    async CheckLatestDR(ctx) {
        const result = await ctx.stub.getState('latestDR');
        return result.toString();
    }

    //return the proposal that is ongoing
    async OnGoingProposal(ctx) {
        let ongoingProp_ID = await ctx.stub.getState('ongoingProposal');
        ongoingProp_ID = 'proposal' + parseInt(ongoingProp_ID);
        const ongoingProp = await ctx.stub.getState(ongoingProp_ID);
        return JSON.parse(ongoingProp);
    }

    //Get the Hash of the ongoing proposal. If it is null, return a statement saying it is empty
    async CheckDRHash(ctx) {
        const ongoingProp = await this.OnGoingProposal(ctx);
        const hash = ongoingProp.Hash;
        return hash !== null ? hash : 'The file is not uploaded by the creator yet';
    }

    async GetDomains (ctx) {
        let domains = await ctx.stub.getState('domains');
        domains = JSON.parse(domains.toString());
        return domains;
    }

    async UpdateDomains(ctx, domains) {
        await ctx.stub.putState('domains', Buffer.from(JSON.stringify(domains)));
    }

    async GetMembers (ctx) {
        let members = await ctx.stub.getState('members');
        members = JSON.parse(members.toString());
        return members;
    }

    async UpdateMembers (ctx, members){
        await ctx.stub.putState('members', Buffer.from(JSON.stringify(members)));
    }

    async CheckOwnProposal(ctx, prop_id, voter_id) {
        console.log('Voter is' + voter_id + 'Proposal author is' + prop_id);
        return prop_id.toString() === voter_id;
    }

    async GetProposal (ctx, proposalID) {
        try{
            let proposal = await ctx.stub.getState(proposalID);
            proposal = JSON.parse(proposal);
            return proposal;
        } catch (e) {
            console.log('error to get proposal' + proposalID);
        }
    }

    async UpdateProposal (ctx, proposal, proposalID) {
        await ctx.stub.putState(proposalID, Buffer.from(JSON.stringify(proposal)));
    }

    async GetTotalVotes (proposal) {
        let totalVotes = proposal.NumAcceptedVotes + proposal.NumRejectedVotes;
        return totalVotes;
    }

    // Add the new vote to the proposal
    async AddVoter (proposal, voterID, voteResult, message){
        let vote = {ID: voterID, Message: message};
        
        if(voteResult === 'accept'){
            proposal.AcceptedVotes.push(vote);
            proposal.NumAcceptedVotes = proposal.AcceptedVotes.length;
        } else if (voteResult === 'reject'){
            proposal.RejectedVotes.push(vote);
            proposal.NumRejectedVotes = proposal.RejectedVotes.length;
        }

        return proposal;
    }

    // A function to remove tokens to a member.
    async RemoveTokens (ctx, member_id, numTokens) {
        const voteDeposit = 10;
        let result = -1;
        let members = await this.GetMembers(ctx);

        let member = members.find(member => member.ID == member_id);
        if (member != undefined){
            let pos = members.indexOf(member);
            member.Tokens -= numTokens;
            if (member.Tokens < voteDeposit) member.Tokens = voteDeposit;
            member.LastParticipation = Date();
            members[pos] = member;
            await this.UpdateMembers(ctx, members);
            result = 1;
        }

        return result;
    }

    // Check whether the voter has already voted once
    async CheckVoteTwice (proposal, voterID){
        let voted = false;
        
        let member = proposal.AcceptedVotes.find(voter => voter.ID == voterID);
        if (member === undefined) member = proposal.RejectedVotes.find(voter => voter.ID == voterID);

        if(member != undefined) voted = true;

        return voted;
    }

    async CheckLobeOwnerPower(ctx, prop_id, voter_id, vote) {
        //check whether the vote comes from a lobe owner
        let members = await this.GetMembers(ctx);
        let member = members.find(member => member.ID === voter_id);
        if(member.Role !== 'Lobe_Owner') {
            return 'NotLO';
        }
        //Check whether within 24 Hours min since proposal is ongoing
        let startTime = await ctx.stub.getState('time');
        startTime = new Date(startTime);
        let currentT = new Date().getTime();
        if( (currentT - startTime) > 86400000) {
            console.log('Out of time' + (currentT - startTime));
            return 'TimeOut';
        }
        return ('LO');
    }

    async CheckVetoProposal(ctx, type, author_id, originalID){
        // To create a veto proposal, the author should be a lobe owner
        // and the original proposal has been accepted within 30 days
        let members = await this.GetMembers(ctx);
        let member = members.find(member => member.ID === author_id);
        if(member.Role === 'Expert'){
            return true;
        }
        //check whether the original proposal has been created within 30 days
        try {
            //use the 'closedproposal' + number of the original proposal, to find the closed proposal
            const proposalID = 'closedproposal' + originalID.substring(8);
            let proposal = await ctx.stub.getState(proposalID);
            proposal = JSON.parse(proposal);
            let EndDate = proposal.EndDate;
            EndDate = new Date(EndDate);
            const currentT = new Date().getTime();
            return (currentT - EndDate.getTime()) >= 2592000000;
        } catch (e) {
            console.log('Error when getting the creation date of the proposal'+ originalID + e);
        }
    }
    
    //create a new proposal or a veto proposal
    async CreateProposal(ctx, domain, uri, author_id, message, type, originalID){
        //get amount of total proposals, for later update
        let total_proposals = await ctx.stub.getState('total_proposals');
        let valid = parseInt(total_proposals) + 1;
        //generate a new id
        let id = 'proposal'+ valid;
        //get the author
        let members = await this.GetMembers(ctx);
        let member = members.find(member => member.ID == author_id);
        //get the amount of tokens this author, and charge 20 tokens as deposit of the proposal
        let tokens = member.Tokens;
        tokens = parseInt(tokens) -20;
        if (tokens < 0) {
            return ('Sorry you do not have enough tokens!');
        } else {
            await this.RemoveTokens(ctx, author_id, 20);
        }
        //Check whether this proposal is a veto proposal
        if(type !== 'newProposal'){
            //Check whether the author is able to create a veto proposal
            let vetoPower = await this.CheckVetoProposal(ctx, type, author_id, originalID);
            console.log('*****It is a veto proposal'+vetoPower + type + author_id);
            if(vetoPower === true){
                return ('Sorry You are not able to create this veto proposal');
            }
        }
        const proposal = {
            ID: id,
            URI: uri,
            Domain: domain,
            Valid: valid.toString(),
            AuthorID: author_id,
            Proposal_Message: message,
            Creation_Date: Date(),
            State: 'open',
            Type: type,
            OriginalID: originalID,
            AcceptedVotes: 0,
            RejectedVotes: 0,
            AcceptedVotes: [],
            RejectedVotes: [],
            Hash:'',
        };
        await ctx.stub.putState('total_proposals', Buffer.from(JSON.stringify(parseInt(total_proposals) + 1)));
        //the author's total proposals should increase by 1
        member.Total_Proposal = parseInt(member.Total_Proposal)+1;
        //add new proposal to the world state
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(proposal)));
        return ('You successfully create a proposal!');
    }

    //It is triggered when members vote for a proposal
    async ValidateProposal(ctx, prop_id, voter_id, vote, message) {
        console.log(prop_id, voter_id, vote, message);
        const tokenDeposit = 10;
        let result = {
            ProposalID: prop_id,
            Finished: false,
            Message: '',
            Result: vote
        }

        let proposal = await this.GetProposal(ctx, prop_id);

        //check whether the voter votes for his own proposal
        const ownProposal = await this.CheckOwnProposal(ctx, proposal.AuthorID, voter_id);
        if(ownProposal === true) {
            result.Message = 'Sorry you can not vote for your own proposal!'
            return JSON.stringify(result);
        }

        const voteTwice = await this.CheckVoteTwice(proposal, voter_id);
        if(voteTwice===true) {
            result.Message = 'Sorry you have already vote for ' + prop_id
            return JSON.stringify(result);
        }
        
        //check whether the vote comes from a lobe owner && within 24 hours since proposal has been ongoing
        let lobeownerVote = await this.CheckLobeOwnerPower(ctx, prop_id, voter_id, vote);
        console.log('The result*****' + lobeownerVote);
        try {
            if (lobeownerVote === 'TimeOut') {
                result.Message = 'Lobe Owner cannot vote after 24 hours since the proposal is ongoing';
                return JSON.stringify(result);
            }
            if(lobeownerVote === 'LO') {
                // A lobe owner votes within 24 hour, so his vote decide the result of the proposal
                // thus, EndProposal() is triggered. Remove the deposit of tokens for voting.
                console.log('*******' + proposal.URI);
                let removeResult = await this.RemoveTokens(ctx, voter_id, tokenDeposit);
                if(removeResult === -1) {
                    result.Message = 'Problems removing tokens';
                    return JSON.stringify(result);
                }

                proposal = await this.AddVoter(proposal, voter_id, vote, message);
                await this.UpdateProposal(ctx, proposal, prop_id);
                
                if(vote === 'accept') {
                    await ctx.stub.putState('latestDR', Buffer.from(JSON.stringify(proposal.URI)));
                }
                result.Message = 'Lobe Owner Successfully Vote for proposal!';
                result.Finished = true;
                return JSON.stringify(result);
            }
        } catch(e){
            console.log('********Problems when checking Lobe Owners Voting power'+e);
        }

        // Remove the deposit to the member 
        let removeResult = await this.RemoveTokens(ctx, voter_id, tokenDeposit);
        if(removeResult === -1) {
            result.Message = 'Problems removing tokens';
            return JSON.stringify(result);
        } 

        let total_members = await ctx.stub.getState('total_members');
        total_members = JSON.parse(total_members);

        // Add the vote inside the proposal
        proposal = await this.AddVoter(proposal, voter_id, vote, message);
        await this.UpdateProposal(ctx, proposal, prop_id);
        
        const totalVotes = await this.GetTotalVotes(proposal);
        // Check whether already majority members have voted fo the proposal
        // If yes, the will check the result of the proposal and then close it.
        // Here we take 50% as majority
        if(totalVotes > total_members/2) {
            let finalResult = await this.ProposalVoteResult(ctx, proposal);
            return finalResult;
        }

        result.Message = 'Successfully Vote for proposal!';

        return JSON.stringify(result);
    }

    //check the result of a proposal
    async ProposalVoteResult(ctx, proposal) {
        let result = {
            ProposalID: proposal.ID,
            Finished: true,
            Message: "Error",
            Result: -1
        }
        //For a veto proposal, if there are 70% of members vote for rejection, it will be rejected
        if (proposal.Type.toString() === 'vetoProposal') {
            if(proposal.NumRejectedVotes/(proposal.NumRejectedVotes+proposal.NumAcceptedVotes) >= 0.7) {
                result.Result = 'accept';
                result.Message = "Veto proposal voting finished as " + "accepted";
                await ctx.stub.putState('latestDR', Buffer.from(JSON.stringify(proposal.URI)));
            }
            else {
                result.Result = 'reject';
                result.Message = "Veto proposal voting finished as " + "rejected";
            }
        }
        //For a new proposal, if there are 50% of members vote for acceptance, it will be accepted
        else if (proposal.Type.toString() === 'newProposal') {
            if(proposal.NumAcceptedVotes >= proposal.NumRejectedVotes) {
                result.Result = 'accept';
                result.Message = "New proposal voting finished as " + "accepted";
                await ctx.stub.putState('latestDR', Buffer.from(JSON.stringify(proposal.URI)));
            }
            else {
                result.Result = 'reject';
                result.Message = "New proposal voting finished as " + "rejected";
            }
        }
        return result;
    }

    // Close the proposal with 'id' as 'result'
    // Reward the relative participants
    // Add the closed proposal to 'closedProposals'
    async EndProposal(ctx, proposalID, result) {
        
        //update the ongoing proposal to the next one based on creation date
        let ongoingprop = await ctx.stub.getState('ongoingProposal');
        await ctx.stub.putState('ongoingProposal', Buffer.from(JSON.stringify(parseInt(ongoingprop) + 1)));

        // Update the start time for ongoing proposal
        await ctx.stub.putState('time', Buffer.from(Date()));

        let proposal = await this.GetProposal(ctx, proposalID);

        
        //Reward the voters that have vote the final result
        let resultRewarding = await this.RewardVoters(ctx, proposal, result);
        if (resultRewarding === -1) return ("Problems rewarding voters");
        
        //delete the closed proposal from world state
        let closedProposalID = 'closedproposal' + proposal.ID.substring(8);
        console.log(closedProposalID + '**********ClosedProposalID');
        const closedProposal = {
            ID: closedProposalID,
            State: result,
            EndDate: Date(),
            Veto: false
        };

        await ctx.stub.putState(closedProposalID, Buffer.from(JSON.stringify(closedProposal)));
        await ctx.stub.deleteState(proposal.ID);
        return ('The proposal ended as ' + result);
    }

    //Reward the voters that have vote the final result
    async RewardVoters (ctx, proposal, result) {
        const proposalDeposit = 20;
        const voteDeposit = 10;
        const reward = 10;
        let members = await this.GetMembers(ctx);
        let votes;
        let member;
        let pos;
        
        if (result === 'accept') {
            votes = proposal.AcceptedVotes;
        } else {
            votes = proposal.RejectedVotes;
        }

        // Reward voters
        for (let vote of votes) {
            member = members.find(expert => expert.ID == vote.ID);
            if (member != undefined) {
                pos = members.indexOf(member);
                members[pos].Tokens += (voteDeposit + reward);
            }
        }

        // Reward proposal author
        if (result === 'accept') {
            member = members.find(expert => expert.ID == proposal.AuthorID);
            if (member != undefined) {
                pos = members.indexOf(member);
                members[pos].Tokens += (proposalDeposit + reward);
            }
        }

        await this.UpdateMembers(ctx, members);
    }

    // Function to check the if the user has been inactive
    // If the user has been inactive they will be penalised depending on how long they have been inactive:
    // Less than six months 10 Tokens/Month
    // Six or more months but less than twelve => 100 + 20 Tokens/Month (Only the months from the sixth month onwards)
    // Twelve of more months => 300 + 30 Tokens/Month (Only the months from the twelfth month onwards)
    async CheckInactivity (ctx, memberID) {
        const perMonthUnderSix = 10;
        const sixMonthPen = 100;
        const perMonthUnderTwelve = 20;
        const twelveMonthPen = 300;
        const perMonthOverTwelve = 30;
        let members = await this.GetMembers(ctx);
        let penalization = -1;

        let member = members.find(member => member.ID == memberID);
        if(member != undefined){
            let months = await this.CalculateMonthDifference(member);
            if (months < 1){
                penalization = 0;
            } else if (months < 6) {
                penalization = months * perMonthUnderSix;
            } else if (months < 12) {
                months -= 6;
                penalization = sixMonthPen + months * perMonthUnderTwelve;
            } else if (months >= 12) {
                months -= 12;
                penalization = twelveMonthPen + months * perMonthOverTwelve;
            }

            if (penalization != 0) await this.RemoveTokens(ctx, member.ID, penalization);
        }

        return penalization;
    }

    async CalculateMonthDifference (member) {
        let currentDate = new Date();
        let lastParticipation = new Date(member.LastParticipation);
        
        let difference = currentDate.getMonth() - lastParticipation.getMonth() + 12 * (currentDate.getFullYear() - lastParticipation.getFullYear());

        return difference;
    }

    //Check if a member who is noe the lobe owner but has the highest tokens under a domain
    //This member will be a new lobe owner
    async CheckNewLobOwner(ctx) {
        let members = await this.GetMembers(ctx);
        let domains = await this.GetDomains(ctx);
        let domainMembers;
        let oldLobeOwner;
        let newLobeOwner;
        let posOld;
        let posNew;

       
        for (let i = 0; i < domains.length; i++) {
            oldLobeOwner = members.find(member => member.ID === domains[i].LobeOwner);
            // Filter the array with only the members of the domain, without Lobe Owner and with more tokens than the Lobe Owner
            domainMembers = members.filter(member => {return member.Domain === domains[i].ID && member.ID !== oldLobeOwner.ID && member.Tokens > oldLobeOwner.Tokens});
            
            if (domainMembers.length > 0){
                posOld = members.indexOf(oldLobeOwner);
                newLobeOwner = domainMembers.reduce((prev, current) => (prev.Tokens > current.Tokens) ? prev : current);
                posNew = members.indexOf(newLobeOwner);

                oldLobeOwner.Role = 'Expert';
                newLobeOwner.Role = 'Lobe_Owner';
                domains[i].LobeOwner = newLobeOwner.ID;

                members[posOld] = oldLobeOwner;
                members[posNew] = newLobeOwner;
            }
        }

        await this.UpdateMembers(ctx, members);
        await this.UpdateDomains(ctx, domains);
        return 'Lobe Owners updated!';
    }

    async CheckTime(ctx) {
        //lastingTime is time for a proposal to be processed. Here it is set to be 5 min
        let lastingTime = 300000;
        let ongoingtime = await ctx.stub.getState('time');
        ongoingtime = new Date(ongoingtime);
        let currentT = new Date().getTime();
        let time = ongoingtime.getTime() + lastingTime- currentT;
        console.log(time);
        if(time <= 0) {
            try {
                await this.CloseProposal(ctx);
            } catch (e) {
                console.log('Fail to close a proposal without enough votes' + e);
            }
        }
    }
    
    async DRUpload_Available(ctx) {
        console.log(' checking the DRUpload Right');
        let ongoingProp_ID = await ctx.stub.getState('ongoingProposal');
        ongoingProp_ID = 'proposal' + JSON.parse(ongoingProp_ID);
        console.log('The ongoingPro ID' + ongoingProp_ID);
        let Prop = await ctx.stub.getState(ongoingProp_ID);
        Prop = JSON.parse(Prop);
        return Prop.AuthorID;
    }
}

module.exports = DRChaincode;