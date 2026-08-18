# Heritage Restored — working agreement

## Never push or deploy without being told, in that message

`git push` publishes to GitHub, which auto-deploys to Cloudflare and puts
changes on heritagerestored.org. Pushing is therefore a production deploy.

**Do not run `git push` unless the user says to push in that specific message.**

This is not satisfied by any of the following:

- The user approved the work ("do A, B and C")
- The user set a deadline ("I want this done overnight")
- The user authorized a push earlier in the session
- The work is finished, verified, and the build is green

None of those are permission to push. Approving work is not approving a deploy.
Ask, or stop and say the work is ready and unpushed.

The same applies to `git merge` into `main`, and to force-pushing anything.

Committing locally is fine when the user asks for the work to be committed.

## When work is finished

Say it is ready, name the commits, and stop. Offer the push command for the
user to run or approve. Do not run it for them.
