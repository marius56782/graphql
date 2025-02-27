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

import { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { generate } from "randomstring";
import neo4j from "../neo4j";
import { Neo4jGraphQL } from "../../../src/classes";

describe("BigInt", () => {
    let driver: Driver;

    beforeAll(async () => {
        driver = await neo4j();
    });

    afterAll(async () => {
        await driver.close();
    });

    describe("create", () => {
        test("should create an object with a BigInt specified inline in the mutation", async () => {
            const session = driver.session();

            const typeDefs = `
                type File {
                  name: String!
                  size: BigInt!
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
            });

            const name = generate({
                charset: "alphabetic",
            });

            const create = `
                mutation {
                    createFiles(input: [{ name: "${name}", size: 9223372036854775807 }]) {
                        files {
                            name
                            size
                        }
                    }
                }
            `;

            try {
                const gqlResult = await graphql({
                    schema: neoSchema.schema,
                    source: create,
                    contextValue: { driver, driverConfig: { bookmarks: session.lastBookmark() } },
                });

                expect(gqlResult.errors).toBeFalsy();

                const result = await session.run(`
                    MATCH (f:File {name: "${name}"})
                    RETURN f {.name, .size} as f
                `);

                expect((result.records[0].toObject() as any).f).toEqual({
                    name,
                    size: {
                        high: 2147483647,
                        low: -1,
                    },
                });
            } finally {
                await session.close();
            }
        });
    });

    describe("read", () => {
        test("should successfully query an node with a BigInt property", async () => {
            const session = driver.session();

            const typeDefs = `
                type File {
                  name: String!
                  size: BigInt!
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
            });

            const name = generate({
                charset: "alphabetic",
            });

            const query = `
                query {
                    files(where: { name: "${name}" }) {
                        name
                        size
                    }
                }
            `;

            try {
                await session.run(`
                   CREATE (f:File)
                   SET f.name = "${name}"
                   SET f.size = 9223372036854775807
               `);

                const gqlResult = await graphql({
                    schema: neoSchema.schema,
                    source: query,
                    contextValue: { driver, driverConfig: { bookmarks: session.lastBookmark() } },
                });

                expect(gqlResult.errors).toBeFalsy();

                expect((gqlResult?.data as any)?.files[0]).toEqual({
                    name,
                    size: "9223372036854775807",
                });
            } finally {
                await session.close();
            }
        });
    });

    describe("@cypher directive", () => {
        test("should work returning a BigInt property", async () => {
            const session = driver.session();

            const name = generate({
                charset: "alphabetic",
            });

            const typeDefs = `
                type File {
                  name: String!
                  size: BigInt! @cypher(statement: """
                      RETURN 9223372036854775807
                  """)
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
            });

            const query = `
                query {
                    files(where: { name: "${name}" }) {
                        name
                        size
                    }
                }
            `;

            try {
                await session.run(`
                   CREATE (f:File)
                   SET f.name = "${name}"
               `);

                const gqlResult = await graphql({
                    schema: neoSchema.schema,
                    source: query,
                    contextValue: { driver, driverConfig: { bookmarks: session.lastBookmark() } },
                });

                expect(gqlResult.errors).toBeFalsy();

                expect((gqlResult?.data as any)?.files[0]).toEqual({
                    name,
                    size: "9223372036854775807",
                });
            } finally {
                await session.close();
            }
        });
    });
});
