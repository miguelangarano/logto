import http from 'http';

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      console.log('Received POST request:');
      console.log(req.headers);
      console.log(body);
    //   res.writeHead(405, { 'Content-Type': 'text/plain' });
    // res.end('Method Not Allowed');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Received POST request');
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

const PORT = 3132;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
