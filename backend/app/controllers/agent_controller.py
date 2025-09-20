import logging
import os
from dotenv import load_dotenv
from fastapi import HTTPException, status
from app.controllers.mcp_controller import MariadbMCPClient

load_dotenv()

MARIADB_MCP_URL = os.getenv("MARIADB_MCP_URL")


class QueryAgent:
    @staticmethod
    async def process_query(query):
        try:
            async with MariadbMCPClient(url=MARIADB_MCP_URL) as agent:
                messages = [
                    {
                        "role": "system",
                        "content": """You are a Customer Support Agent and use tools to perform the task on the database "supozy_db".
                                      <task>
                                          1. Retreive relevant data based on query from conversation_embeddings table using search_vector_store tool.
                                          2. Analyze the retrieved data to find best answer/solution to the user query.
                                          3. If retrieved data does not contain the answer then just say - 'Your query requires specialized attention. I am escalating it to our expert team for a detailed response.'
                                      </task>

                                      DO NOT hallucinate.
                                      DO NOT USE any delete or create tools under any given circumstances.""",
                    }
                ]
                response, messages = await agent.process(query, messages)
                return response
        except Exception as e:
            logging.error(f"Error processing: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing: {str(e)}",
            )


class EmbeddingAgent:
    @staticmethod
    async def process_query(conversation_id):
        try:
            async with MariadbMCPClient(url=MARIADB_MCP_URL) as agent:
                messages = [
                    {
                        "role": "system",
                        "content": f"""You are a mariadb SQL expert and use only (insert_docs_vector_store, execute_sql tools, get_table_schema, get_table_schema_with_relations) to perform the task on the database "supozy_db".
                                      <task>
                                          1. List messages of conversation_id({conversation_id}) from table 'messages'.
                                          2. Analyze the user & assistant messages very carefully and transform it into a single query/resolution data.
                                          3. Analyze the vector store 'conversation_embeddings'.
                                          4. Generate embeddings on the transformed data and insert into vector store 'conversation_embeddings' using insert_docs_vector_store.
                                      </task>
                                      <insert_docs_vector_store_schema>
                                           {{
                                              "tool": "insert_docs_vector_store",
                                              "parameters": {{
                                                "database_name": "test_db",
                                                "vector_store_name": "my_vectors",
                                                "documents": ["Sample text 1", "Sample text 2"],
                                                "metadata": [{{"source": "doc1"}}, {{"source": "doc2"}}]
                                              }}
                                            }}
                                      </insert_docs_vector_store_schema>

                                      FOLLOW the order of task.
                                      DO NOT USE any delete or create tools under any given circumstances.""",
                    }
                ]
                await agent.process("", messages)

        except Exception as e:
            logging.error(f"Error processing: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing: {str(e)}",
            )
