module.exports = {
  async up(connection) {
    // JavaScript dictionary keys are case-sensitive (for example Quoted and quoted).
    await connection.query('ALTER TABLE translation_keys MODIFY namespace VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL, MODIFY key_name VARCHAR(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs NOT NULL')
  },
}
