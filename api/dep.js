import uuid from '@/utils/uuid';

function cascadeDepList(deps) {
  function handleCascade(parent) {
    const children = deps.filter(dep =>
      dep._rel.length === parent._rel.length + 1 && dep._rel.includes(parent._id)
    );
    if (children.length > 0) {
      parent.children = children;
      parent.children.forEach(t => handleCascade(t));
    }
  };

  const minLength = Math.min(...deps.map(t => t._rel.length));
  const cascade = deps.filter(dep => dep._rel.length <= minLength);
  deps.forEach(t => handleCascade(t));

  return cascade;
}

export default function(server, db) {
  const depDB = db.collection('department');

  server.get('/dep', async (req, res, next) => {
    const result = await depDB.find({}).toArray();
    const isCascade = req.query['cascade'];
    res.send(isCascade ? cascadeDepList(result) : result);

    return next();
  });

  server.get(`/dep/:depid`, async (req, res, next) => {
    const isCascade = req.query['cascade'];
    const isUnder = req.query['under'];

    const method = isUnder ? 'find' : 'findOne';
    const cond = isUnder ? '_rel' : '_id';

    let queryResult = depDB[method]({
      [cond]: req.params['depid']
    });

    if (isUnder) {
      queryResult = queryResult.toArray();
    }

    let result = await queryResult;
    res.send(isCascade && isUnder ? cascadeDepList(result) : result);

    return next();
  });

  server.post('/dep', async (req, res, next) => {
    const postDepInfo = req.body;
    postDepInfo._id = uuid();
    postDepInfo._rel.push(postDepInfo._id);
    await depDB.insertOne(postDepInfo);

    res.status(201);
    res.send(postDepInfo);

    return next();
  })

  server.put('/dep/:depid', async (req, res, next) => {
    const dep = req.body;
    depDB.findOneAndUpdate({ _id: req.params['depid'] || '' }, { $set: dep }).then(result => {
      res.status(result.ok ? 201 : 404);
      res.send(result.ok ? dep : undefined);
    })

    return next();
  })

  server.del('/dep/:depid', async (req, res, next) => {
    await depDB.deleteOne({ _id: req.params['depid'] || '' });
    res.status(204);
    res.send();

    return next();
  })
}