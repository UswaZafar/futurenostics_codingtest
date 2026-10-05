import { app } from "./app";
import { env } from "./utils/env";

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
