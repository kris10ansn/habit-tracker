// drizzle-kit generates this bundle as JS: it imports the versioned .sql files (inlined as strings
// by babel-plugin-inline-import) and the journal. Re-exported here so the one untyped import (it
// resolves via allowJs, typed `any`) has a single home; handed to useMigrations in _layout.
import migrations from "./drizzle/migrations";

export { migrations };
