for i in {1..20}; do
  curl -s http://localhost:3000/api/users > /dev/null
  curl -s -X POST http://localhost:3000/api/orders > /dev/null
  sleep 1
done