// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IOracle {
   function createLlmCall(
        uint promptId
    ) external returns (uint);
   function createKnowledgeBaseQuery(
        uint kbQueryCallbackId,
        string memory cid,
        string memory query,
        uint32 num_documents
    ) external returns (uint i);
}
