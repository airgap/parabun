import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Inner($$anchor, $$props) {
	$.push($$props, true);

	function push() {
		const d = Promise.withResolvers();

		$$props.deferred.push(() => d.resolve());

		return d.promise;
	}

	var p = root();

	$.head('4e8r38', ($$anchor) => {
		$.effect(() => {
			$.document.title = 'title';
		});
	});

	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push()]);
	$.append($$anchor, p);
	$.pop();
}