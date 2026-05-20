import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Sub from './Sub.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let componentName = $.prop($$props, 'componentName', 12, 'Sub');
	let proxy = new Proxy(Sub, {});
	let banana = {};
	let component = $.mutable_source();

	$.legacy_pre_effect(() => ($.deep_read_state(componentName()), Sub), () => {
		if (componentName() === 'Sub') $.set(component, Sub); else if (componentName() === 'Proxy') $.set(component, proxy); else $.set(component, banana);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get componentName() {
			return componentName();
		},

		set componentName($$value) {
			componentName($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => $.get(component), ($$anchor, $$component) => {
		$$component($$anchor, {});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}