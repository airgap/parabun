import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Outer from "./Outer.svelte";
import Inner from "./Inner.svelte";
import { model } from "./store.svelte";

var root = $.from_html(`<!> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 12, '');
	let fallback = $.prop($$props, 'fallback', 12, '');

	function getSubscriberCount() {
		return model.getCount();
	}

	var $$exports = {
		getSubscriberCount,
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		},

		get fallback() {
			return fallback();
		},

		set fallback($$value) {
			fallback($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	Outer(node, {
		get slotProps() {
			return props();
		},

		get defaultValue() {
			return fallback();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const slotProps = $.derived_safe_equal(() => $$slotProps.slotProps);

				Inner($$anchor, {
					get value() {
						return $.get(slotProps);
					}
				});
			}
		}
	});

	var node_1 = $.sibling(node, 2);

	Outer(node_1, {
		get slotProps() {
			return props();
		},

		get defaultValue() {
			return fallback();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const slotProps = $.derived_safe_equal(() => $$slotProps.slotProps);

				Inner($$anchor, {
					get value() {
						return $.get(slotProps);
					}
				});
			}
		}
	});

	var node_2 = $.sibling(node_1, 2);

	Outer(node_2, {
		get slotProps() {
			return props();
		},

		get defaultValue() {
			return fallback();
		}
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'getSubscriberCount', getSubscriberCount);

	return $.pop($$exports);
}