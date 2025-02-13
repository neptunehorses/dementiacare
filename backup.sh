#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup"

# MongoDB 백업
docker exec mongo mongodump --out /data/backup/$DATE

# 업로드된 파일 백업
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# 오래된 백업 삭제 (30일 이상)
find $BACKUP_DIR -type f -mtime +30 -exec rm {} \; 