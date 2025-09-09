// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RiseUpGovernanceToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }
}

contract RiseUpDAO is Ownable, ReentrancyGuard {
    RiseUpGovernanceToken public governanceToken;

    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        string proposalType; // "parameter", "funding", "contract"
        bytes data; // Encoded function calls
        uint256 value; // ETH value for funding proposals
        uint256 startTime;
        uint256 endTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
        mapping(address => Vote) votes;
    }

    // Vote structure
    struct Vote {
        bool hasVoted;
        uint8 support; // 0 = Against, 1 = For, 2 = Abstain
        uint256 votes;
        uint256 timestamp;
    }

    // Treasury structure
    struct TreasuryAllocation {
        address recipient;
        uint256 amount;
        string purpose;
        uint256 allocatedAt;
        bool claimed;
    }

    // State variables
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    mapping(address => uint256) public lastVoteTime;

    TreasuryAllocation[] public treasuryAllocations;

    uint256 public proposalCount;
    uint256 public votingPeriod = 7 days;
    uint256 public votingDelay = 1 days;
    uint256 public proposalThreshold = 1000 * 10**18; // 1000 tokens
    uint256 public quorumThreshold = 10000 * 10**18; // 10000 tokens

    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint8 support, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event TreasuryAllocationCreated(uint256 indexed allocationId, address indexed recipient, uint256 amount);
    event TreasuryFundsClaimed(uint256 indexed allocationId, address indexed recipient);

    constructor(address _governanceToken) Ownable(msg.sender) {
        governanceToken = RiseUpGovernanceToken(_governanceToken);
    }

    // Create a new proposal
    function propose(
        string memory title,
        string memory description,
        string memory proposalType,
        bytes memory data,
        uint256 value
    ) public returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) >= proposalThreshold, "Insufficient tokens to propose");

        uint256 proposalId = ++proposalCount;
        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.title = title;
        proposal.description = description;
        proposal.proposalType = proposalType;
        proposal.data = data;
        proposal.value = value;
        proposal.startTime = startTime;
        proposal.endTime = endTime;
        proposal.executed = false;
        proposal.canceled = false;

        emit ProposalCreated(proposalId, msg.sender, title);
        return proposalId;
    }

    // Cast a vote on a proposal
    function castVote(uint256 proposalId, uint8 support) public {
        require(support <= 2, "Invalid vote type");
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp >= proposal.startTime, "Voting has not started");
        require(block.timestamp <= proposal.endTime, "Voting has ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.canceled, "Proposal canceled");

        Vote storage vote = proposal.votes[msg.sender];
        require(!vote.hasVoted, "Already voted");

        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        require(voterBalance > 0, "No voting power");

        vote.hasVoted = true;
        vote.support = support;
        vote.votes = voterBalance;
        vote.timestamp = block.timestamp;

        if (support == 0) {
            proposal.againstVotes += voterBalance;
        } else if (support == 1) {
            proposal.forVotes += voterBalance;
        } else {
            proposal.abstainVotes += voterBalance;
        }

        lastVoteTime[msg.sender] = block.timestamp;

        emit VoteCast(proposalId, msg.sender, support, voterBalance);
    }

    // Execute a successful proposal
    function executeProposal(uint256 proposalId) public nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp > proposal.endTime, "Voting has not ended");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.canceled, "Proposal canceled");

        // Check if proposal passed
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        require(totalVotes >= quorumThreshold, "Quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "Proposal did not pass");

        proposal.executed = true;

        // Execute the proposal
        if (bytes(proposal.proposalType).length > 0) {
            if (keccak256(bytes(proposal.proposalType)) == keccak256(bytes("funding"))) {
                // Handle funding proposal
                require(address(this).balance >= proposal.value, "Insufficient treasury funds");
                payable(proposal.proposer).transfer(proposal.value);
            } else if (keccak256(bytes(proposal.proposalType)) == keccak256(bytes("parameter"))) {
                // Handle parameter change (would need specific logic)
                // This is a placeholder for parameter updates
            }
        }

        emit ProposalExecuted(proposalId);
    }

    // Cancel a proposal
    function cancelProposal(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");
        require(proposal.proposer == msg.sender || msg.sender == owner(), "Not authorized");
        require(!proposal.executed, "Cannot cancel executed proposal");

        proposal.canceled = true;

        emit ProposalCanceled(proposalId);
    }

    // Treasury management
    function allocateTreasuryFunds(
        address recipient,
        uint256 amount,
        string memory purpose
    ) public onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(address(this).balance >= amount, "Insufficient funds");

        TreasuryAllocation memory allocation = TreasuryAllocation({
            recipient: recipient,
            amount: amount,
            purpose: purpose,
            allocatedAt: block.timestamp,
            claimed: false
        });

        treasuryAllocations.push(allocation);

        emit TreasuryAllocationCreated(treasuryAllocations.length - 1, recipient, amount);
    }

    function claimTreasuryFunds(uint256 allocationId) public {
        TreasuryAllocation storage allocation = treasuryAllocations[allocationId];
        require(allocation.recipient == msg.sender, "Not authorized");
        require(!allocation.claimed, "Already claimed");
        require(address(this).balance >= allocation.amount, "Insufficient funds");

        allocation.claimed = true;
        payable(msg.sender).transfer(allocation.amount);

        emit TreasuryFundsClaimed(allocationId, msg.sender);
    }

    // Get proposal state
    function getProposalState(uint256 proposalId) public view returns (
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed,
        bool canceled,
        uint256 endTime
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.canceled,
            proposal.endTime
        );
    }

    // Get vote receipt
    function getVote(uint256 proposalId, address voter) public view returns (
        bool hasVoted,
        uint8 support,
        uint256 votes
    ) {
        Vote memory vote = proposals[proposalId].votes[voter];
        return (vote.hasVoted, vote.support, vote.votes);
    }

    // Update governance parameters
    function updateVotingPeriod(uint256 newPeriod) public onlyOwner {
        votingPeriod = newPeriod;
    }

    function updateVotingDelay(uint256 newDelay) public onlyOwner {
        votingDelay = newDelay;
    }

    function updateProposalThreshold(uint256 newThreshold) public onlyOwner {
        proposalThreshold = newThreshold;
    }

    function updateQuorumThreshold(uint256 newThreshold) public onlyOwner {
        quorumThreshold = newThreshold;
    }

    // Emergency functions
    function emergencyWithdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Receive function to accept treasury deposits
    receive() external payable {}
}
