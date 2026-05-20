import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

const one = $.wrap_snippet(Child, function ($$anchor) {
	$.validate_snippet_args(...arguments);
	$.add_svelte_meta(() => two($$anchor), 'render', Child, 8, 1);
});

const two = $.wrap_snippet(Child, function ($$anchor) {
	$.validate_snippet_args(...arguments);
	$.next();

	var text = $.text();

	text.nodeValue = 'hello';
	$.append($$anchor, text);
});

const message = 'hello';

export { one };

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}