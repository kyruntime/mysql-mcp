[English](README.md) | [中文](README_zh.md) | [한국어](README_ko.md) | [日本語](README_ja.md)

# MySQL MCP Server

AI 어시스턴트(Cursor, Claude 등)를 MySQL 데이터베이스에 연결하는 MCP 서버입니다.

자연어로 데이터베이스와 대화하세요.

## 기능

- **mysql_query** — 읽기 전용 SELECT 쿼리 실행 (최대 1000행)
- **mysql_execute** — INSERT / UPDATE / DELETE 실행, 트랜잭션 지원
- **mysql_list_tables** — 모든 테이블 목록 (엔진, 행 수, 크기, 정렬)
- **mysql_describe_table** — 테이블 구조 확인 (컬럼, 타입, 키, 코멘트)
- **mysql_show_indexes** — 테이블의 모든 인덱스 확인
- **mysql_show_create_table** — 전체 DDL (CREATE TABLE) 내보내기
- **mysql_explain** — SQL 실행 계획 분석 (TRADITIONAL / JSON / TREE)
- **mysql_list_databases** — 모든 데이터베이스 및 크기 목록
- **mysql_database_info** — 버전, 크기, 문자셋, 연결 수, 가동 시간 확인
- **mysql_show_processlist** — 활성 연결 및 실행 중인 쿼리 확인

## 보안

- SQL 인젝션 패턴 감지 (DROP, TRUNCATE, OUTFILE, LOAD_FILE 등)
- 쿼리 길이 제한 (4096자)
- 테이블/데이터베이스명 화이트리스트 검증 (영숫자 + 밑줄만 허용)
- 쓰기 작업 기본 비활성화 (환경 변수로 활성화)
- 트랜잭션 지원, 오류 시 자동 롤백
- 커넥션 풀 (최대 10개)
- 파라미터화된 쿼리 지원
- MySQL 8.0+ `caching_sha2_password` 인증 네이티브 지원

## 빠른 시작

### 옵션 1: npx (권장)

`~/.cursor/mcp.json`에 추가:

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "npx",
      "args": ["-y", "@kyruntime/mysql-mcp"],
      "env": {
        "MYSQL_HOST": "127.0.0.1",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASS": "비밀번호",
        "MYSQL_DB": "데이터베이스명"
      }
    }
  }
}
```

### 옵션 2: 클론 후 실행

```bash
git clone https://github.com/kyruntime/mysql-mcp.git
cd mysql-mcp
npm install
```

`mcp.json`에 설정:

```json
{
  "mcpServers": {
    "mysql-mcp": {
      "command": "node",
      "args": ["/path/to/mysql-mcp/index.js"],
      "env": {
        "MYSQL_HOST": "127.0.0.1",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASS": "비밀번호",
        "MYSQL_DB": "데이터베이스명"
      }
    }
  }
}
```

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| MYSQL_HOST | 127.0.0.1 | 데이터베이스 호스트 |
| MYSQL_PORT | 3306 | 데이터베이스 포트 |
| MYSQL_USER | root | 데이터베이스 사용자 |
| MYSQL_PASS | (비어 있음) | 데이터베이스 비밀번호 |
| MYSQL_DB | (비어 있음) | 데이터베이스명 |
| MAX_ROWS | 1000 | SELECT 최대 반환 행 수 |
| ALLOW_INSERT_OPERATION | false | INSERT 활성화 |
| ALLOW_UPDATE_OPERATION | false | UPDATE 활성화 |
| ALLOW_DELETE_OPERATION | false | DELETE 활성화 |

## 사용 예시

AI 어시스턴트에게 물어보세요:

```
"데이터베이스에 어떤 테이블이 있나요?"
"users 테이블 구조를 보여주세요"
"orders 테이블에 어떤 인덱스가 있나요?"
"products 테이블의 CREATE TABLE을 보여주세요"
"금액이 가장 높은 주문 10건을 찾아주세요"
"이 쿼리가 인덱스를 사용하나요? SELECT * FROM orders WHERE user_id = 1"
"이 서버에 어떤 데이터베이스가 있나요?"
"데이터베이스 크기가 얼마나 되나요?"
"느린 쿼리가 실행 중인가요?"
```

## 요구 사항

- Node.js >= 18
- MySQL 5.7+ 또는 MySQL 8.0+ (권장)
- MCP 호환 AI 클라이언트 (Cursor, Claude Desktop 등)

## 향후 계획

- [ ] 다중 데이터베이스 전환 (`USE db_name`)
- [ ] 테이블 데이터 CSV 내보내기
- [ ] 느린 쿼리 자동 분석 및 최적화 제안

## 라이선스

MIT
