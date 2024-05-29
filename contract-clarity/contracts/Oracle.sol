// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./IOracle.sol";
import "./ChatGpt.sol";

contract Oracle is IOracle {
    address private chatGptAddress;
    address private owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    constructor(address _chatGptAddress) {
        chatGptAddress = _chatGptAddress;
        owner = msg.sender;
    }

    function setChatGptAddress(address _chatGptAddress) external onlyOwner {
        chatGptAddress = _chatGptAddress;
    }

    function createLlmCall(uint runId) external override {
        // Logic to interact with the ChatGPT contract and LLM API
        // This is a placeholder to demonstrate where the LLM interaction would occur
        string memory response = "This is a sample response from LLM";
        string memory errorMessage = "";
        ChatGpt(chatGptAddress).onOracleLlmResponse(runId, response, errorMessage);
    }

    function createKnowledgeBaseQuery(uint runId, string memory knowledgeBaseCID, string memory userMessage, uint numDocs) external override {
        // Logic to interact with the ChatGPT contract and LLM API
        // This is a placeholder to demonstrate where the knowledge base interaction would occur
        string[] memory documents = new string[](numDocs);
        for (uint i = 0; i < numDocs; i++) {
            documents[i] = string(abi.encodePacked("Document ", uint2str(i + 1)));
        }
        string memory errorMessage = "";
        ChatGpt(chatGptAddress).onOracleKnowledgeBaseQueryResponse(runId, documents, errorMessage);
    }

    function handleLlmResponse(uint runId, string memory response, string memory errorMessage) external {
        ChatGpt(chatGptAddress).onOracleLlmResponse(runId, response, errorMessage);
    }

    function handleKnowledgeBaseQueryResponse(uint runId, string[] memory documents, string memory errorMessage) external {
        ChatGpt(chatGptAddress).onOracleKnowledgeBaseQueryResponse(runId, documents, errorMessage);
    }

    // Helper function to convert uint to string
    function uint2str(uint _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
