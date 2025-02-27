/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { gql } from "apollo-server";
import { DocumentNode } from "graphql";
import { Neo4jGraphQL } from "../../../../src";
import { createJwtRequest } from "../../../utils/create-jwt-request";
import { formatCypher, formatParams, translateQuery } from "../../utils/tck-test-utils";

describe("QueryDirection in relationships aggregations", () => {
    const secret = "secret";
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    test("query with directed and undirected relationships with a DEFAULT_UNDIRECTED", async () => {
        typeDefs = gql`
            type User {
                name: String!
                friends: [User!]!
                    @relationship(type: "FRIENDS_WITH", direction: OUT, queryDirection: DEFAULT_UNDIRECTED)
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { jwt: { secret } },
        });
        const query = gql`
            query Users {
                users {
                    friendsAggregate {
                        count
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
"MATCH (this:User)
RETURN this { friendsAggregate: { count: head(apoc.cypher.runFirstColumn(\\"MATCH (this)-[r:FRIENDS_WITH]-(n:User)      RETURN COUNT(n)\\", { this: this })) } } as this"
`);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
    });

    test("query connection with a DIRECTED_ONLY relationship", async () => {
        typeDefs = gql`
            type User {
                name: String!
                friends: [User!]! @relationship(type: "FRIENDS_WITH", direction: OUT, queryDirection: DIRECTED_ONLY)
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { jwt: { secret } },
        });
        const query = gql`
            query Users {
                users {
                    friendsAggregate {
                        count
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
"MATCH (this:User)
RETURN this { friendsAggregate: { count: head(apoc.cypher.runFirstColumn(\\"MATCH (this)-[r:FRIENDS_WITH]->(n:User)      RETURN COUNT(n)\\", { this: this })) } } as this"
`);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
    });

    test("query with a UNDIRECTED_ONLY relationship", async () => {
        typeDefs = gql`
            type User {
                name: String!
                friends: [User!]! @relationship(type: "FRIENDS_WITH", direction: OUT, queryDirection: UNDIRECTED_ONLY)
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { jwt: { secret } },
        });
        const query = gql`
            query Users {
                users {
                    friendsAggregate {
                        count
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
"MATCH (this:User)
RETURN this { friendsAggregate: { count: head(apoc.cypher.runFirstColumn(\\"MATCH (this)-[r:FRIENDS_WITH]-(n:User)      RETURN COUNT(n)\\", { this: this })) } } as this"
`);
        expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
    });
});
