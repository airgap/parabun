import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Parent from './Parent.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let configs = $.prop($$props, 'configs', 28, () => []);
	let parents = $.prop($$props, 'parents', 28, () => ({}));

	var $$exports = {
		get configs() {
			return configs();
		},

		set configs($$value) {
			configs($$value);
			$.flush();
		},

		get parents() {
			return parents();
		},

		set parents($$value) {
			parents($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, configs, $.index, ($$anchor, config) => {
		$.bind_this(
			Parent($$anchor, {
				get value() {
					return ($.get(config), $.untrack(() => $.get(config).value));
				},

				get testcase() {
					return ($.get(config), $.untrack(() => $.get(config).testcase));
				},
				$$legacy: true
			}),
			($$value, config) => parents(parents()[config.testcase] = $$value, true),
			(config) => parents()?.[config.testcase],
			() => [$.get(config)]
		);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}