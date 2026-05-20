import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

const foo = $.wrap_snippet(Child, function ($$anchor, a = $.noop, b = $.noop) {
	$.validate_snippet_args(...arguments);
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `Hello world ${a() + b()}`));
	$.append($$anchor, text);
});

export { foo };

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}