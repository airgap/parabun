import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.add_locations($.from_html(`<button>toggle</button> <!>`, 1), Main[$.FILENAME], [[7, 0]]);

function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let open = $.tag($.state(false), 'open');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.add_svelte_meta(() => Child(node_1, {}), 'component', Main, 10, 1, { componentTag: 'Child' });
			$.append($$anchor, fragment_1);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(open)) $$render(consequent);
			}),
			'if',
			Main,
			9,
			0
		);
	}

	$.delegated('click', button, function click() {
		return $.set(open, !$.get(open));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

if (import.meta.hot) {
	Main = $.hmr(Main);

	import.meta.hot.accept((module) => {
		Main[$.HMR].update(module.default);
	});
}

export default Main;

$.delegate(['click']);