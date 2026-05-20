import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Inner($$anchor, $$props) {
	$.push($$props, true);

	function push() {
		const d = Promise.withResolvers();

		$$props.deferred.push(() => d.resolve('title'));

		return d.promise;
	}

	$.head('4e8r38', ($$anchor) => {
		$.deferred_template_effect(
			($0) => {
				$.document.title = $0 ?? '';
			},
			void 0,
			[() => push()]
		);
	});

	$.pop();
}